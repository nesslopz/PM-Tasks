import { ExtensionContext, ConfigurationTarget, commands, workspace, window, WebviewPanel, Uri, Disposable, ProgressLocation } from 'vscode';

import * as path from 'path';
import * as fs from "fs";
import { Converter as mdConverter } from "showdown";

// JSON Objects for data
import * as Providers from '../providers.json';
import * as Messages from '../messages.json';

// Classes and Utilities
import Provider from '../providers';
import { setProvider, taskListSetting, getCurrentWorkspace } from "../utilities";
import Task, { TaskItem } from './tasks.js';
import moment = require('moment');
import TasklistProvider from './tasklist.js';

export default function tasksCommands(context: ExtensionContext, tasksProvider:TasklistProvider) {
  /**
   * Webview
   */
  // Track currently webview panel
  let currentPanel: WebviewPanel | undefined = undefined;
  let currentPanelListener: Disposable;
  /**
   * Tasks Commands
   */
  let refreshTasklist = commands.registerCommand('PMTaskList.refreshTasklist', () => tasksProvider.refresh());

  let addTask = commands.registerCommand('PMTaskList.addTask', async (tasklist:taskListSetting) => {

    if (!tasklist) {
      const workspaceFolder = await getCurrentWorkspace();
      const pmSettings = workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);
      // Update the configuration value
      let tasklistSettings:taskListSetting[] = pmSettings.get('taskList', []);
      if (tasklistSettings.length > 1) {
        let pickTasklist = await window.showQuickPick(tasklistSettings, {
          placeHolder: Messages.helpers.selectPm,
          ignoreFocusOut: true,
        })
        .then(tasklist => tasklist);

        // Validates if is not canceled, if case, break process
        if (!pickTasklist)
          return;
        else
          tasklist = pickTasklist; // Reasign command parameter `tasklist`
      } else {
        tasklist = tasklistSettings[0]; // Take the first element
      }
    }

    // get provider
    let provider = tasksProvider.providers.find(provider => provider.id === tasklist.projectManager);
    if (!provider) {
      provider = await window.showQuickPick(Providers, {
        placeHolder: Messages.helpers.selectPm,
        ignoreFocusOut: true
      })
      .then((manager:any) => setProvider(manager));
    }

    let newTask:TaskItem = {
      title: await window.showInputBox({
        placeHolder: provider.helpers.newTaskPlaceholder
      }) || ""
    }

    if ( newTask.title ) {
      // let title: string = newTask.split(/^(((?!([@\[\]])).)+)([@\w]+)?\s?([\[\w+\]]+)?/gi);

      // Assign person to task
      // if ( !who ) {
      newTask.who = await window
                    .showQuickPick( await provider.getPeople( tasklist ) )
                    .then(person => person?.id)
      // }
      /*  else {
        who = await provider.getPeople( tasklist )
        .then( people => {
          let posiblePerson = people.filter(person => (person.alias === who || person.alias === `@${who}`))
          if ( posiblePerson.length > 0 )
            return posiblePerson[0].id
        }) || '';
      } */
      // Assign a due date
      // if ( !due ) {
      newTask.date = await window.showInputBox({
        placeHolder: "dd/mm/yyyy",
        validateInput: value => !moment(value, [
            "ddd",
            "dddd",
            "MM-DD-YYYY",
            "MM/DD/YYYY",
            "DD-MM-YYYY",
            "DD/MM/YYYY"
          ]).isValid() ? 'Invalid' : ''
      })
      // }
      // Create Task
      window.withProgress({
          title: Messages.helpers.creatingTask,
          location: ProgressLocation.Window
        }, _ => {
          return new Promise((resolve, reject) => {
            provider!.createTask(tasklist.id, newTask)
            .then(_ => {
              commands.executeCommand('PMTaskList.refreshTasklist');
              resolve();
            })
            .catch(error => {
              window.showErrorMessage(error.MESSAGE);
              reject(error)
            });
          })
      })

    }
  });

  let viewTask = commands.registerCommand('PMTask.viewTask', async (task:Task) => {
    if (task) {
      const columnToShowIn = window.activeTextEditor
        ? -1
        : 1;
      if (currentPanel) {
        // If we already have a panel, show it in the target column
        currentPanelListener.dispose();
        currentPanel.reveal(columnToShowIn);
      } else {
        // Otherwise, create a new panel
        currentPanel = window.createWebviewPanel(
          'pmTaskView',
          `PM Task ${task.id}`,
          columnToShowIn,
          {
            enableScripts: true
          }
        );

      }
      currentPanel.title = `PM Task ${task.id}`;
      currentPanel.webview.html = getTaskWebview(task);
      // Handle messages from the webview
      currentPanelListener = currentPanel.webview.onDidReceiveMessage(
        message => {
          switch (message.action) {
            case 'complete':
              // Complete task
              task.complete().then(() => {
                window.showInformationMessage(`"${ task.label }" has been Completed`);
                tasksProvider.refresh(); // Refresh tasklist
                if (currentPanel) // if webview panel is open (it should be) close it
                  currentPanel.dispose();
              })
              .catch((error:Error) => {
                window.showErrorMessage(error.message);
              });
            return;
          }
        },
        null,
        context.subscriptions
      );
      // Reset when the current panel is closed
      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;
        },
        null,
        context.subscriptions
      );
    } else {
      window.showInformationMessage(Messages.helpers.noTaskSelected);
    }
  });
  /**
   * TODO: Edit and Delete tasks
   * Temporally disabled
   *
   * let editTask = commands.registerCommand('PMTask.editTask', task => window.showWarningMessage(`Edit ${ task.label }`))
   * let deleteTask = commands.registerCommand('PMTask.deleteTask', task => window.showErrorMessage(`Delete ${ task.label }`))
   */
  let completeTask = commands.registerCommand('PMTask.completeTask', async (task?:Task) => {
    if (!task) {
      window.showInformationMessage(Messages.helpers.noTaskSelected);
    } else {
      task.complete()
      .then(() => {
        window.showInformationMessage(`"${ task.label }" has been Completed`);
        tasksProvider.refresh();
      })
      .catch((error:Error) => {
        window.showErrorMessage(error.message);
      });
    }
  });

  /**
   * Configurations commands
   */
  // Configure a Project Managment
  const configPM = async () => {
    let workspaceFolder = await getCurrentWorkspace();

    if (workspaceFolder) {
      // Get Provider from available list
      await window.showQuickPick(Providers, {
        placeHolder: Messages.helpers.selectPm,
        ignoreFocusOut: true
      })
      .then(async (manager) => {
        if (manager) {
          const provider: Provider = setProvider(manager);

          if (provider) {
            /**
             * Get Project
             */
            const tasklists = await provider.getTaskLists();
            await window.showQuickPick(
              tasklists,
              {
                canPickMany       : false,
                matchOnDetail     : true,
                ignoreFocusOut    : true,
                matchOnDescription: true
              }
            )
            .then(async (tasklist) => {
              if (tasklist) {
                delete tasklist.description;
                // Get the configuration for the workspace folder
                const pmSettings = workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);
                // Update the configuration value
                let tasklistSettings = pmSettings.get('taskList', []);
                let newSettings = [
                  ...tasklistSettings,
                  tasklist
                ];
                await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
              }
            });
          }
        }
      });
    } else {
      window.showWarningMessage(Messages.warning.noWorkspace);
    }

  };
  let configurePM = commands.registerCommand('PMTaskList.config', configPM);
  let addNewPM = commands.registerCommand('PMTaskList.addProject', configPM);

  // Settings
  context.subscriptions.push(configurePM);
  context.subscriptions.push(addNewPM);
  // Tasks
  context.subscriptions.push(refreshTasklist);
  context.subscriptions.push(addTask);
  context.subscriptions.push(viewTask);
  /**
   * TODO: Edit and Delete tasks
   * Temporally disabled
   *
   * context.subscriptions.push(editTask);
   * context.subscriptions.push(deleteTask);
   */
  context.subscriptions.push(completeTask);

  const getTaskWebview = (task:Task):string => {
    const filePath: Uri = Uri.file(path.join(context.extensionPath, 'src', 'templates', 'task.html'));
    let html = fs.readFileSync(filePath.fsPath, 'utf8');

    let taskDescription = () => {
      if (task.data) {
        let { start, end, description, progress, estimatedTime } = task.data;

        let firstCard = '';
        if (start || end || progress || estimatedTime) {

          firstCard = '<section>';

          if (start) {
            start = moment(start).calendar(moment.now(), {
                sameDay : '[Today]',
                nextDay : '[Tomorrow]',
                lastDay : '[Yesterday]',
                nextWeek: 'dddd',
                lastWeek: `[${moment(start).fromNow()}]`,
                sameElse: 'DD/MM/YY'
              });
          }

          if ( end ) {
            end = moment(end).calendar(moment.now(), {
              sameDay : '[Today]',
              nextDay : '[Tomorrow]',
              lastDay : '[Yesterday]',
              nextWeek: 'dddd',
              lastWeek: `[${moment(end).fromNow()}]`,
              sameElse: 'DD/MM/YY'
            });
          }

          if (start && end) {
            firstCard += `<article class="card">${start} - ${end}</article>`
          } else if ( end ) {
            firstCard += `<article class="card">Due:${end}</article>`
          }

          if ( progress ) {
            firstCard += `<article class="card">${progress}%</article>`;
          }

          if (estimatedTime) {
            let minutes = moment.duration(estimatedTime, 'minutes');
            firstCard += `<article class="card">${minutes.humanize()}</article>`;
          }
          firstCard += '</section>';

        }

        if (description) {
          let converter = new mdConverter();
          description = `<article>${converter.makeHtml(description)}</article>`;
        }
        return `${firstCard}<section>${description}</section>`;
      } else {
        return '';
      }
    }

    const taskPeople = () => {
      if (task.data && task.data.people) {
        if (Array.isArray(task.data.people)) {
          return task.data.people.map((person) => person['fullName']).join(', ');
        } else {
          return task.data.people;
        }
      } else {
        return '';
      }
    };

    html = html
          .replace(/{__task_details__}/gi, taskDescription())
          .replace(/{__task_id__}/gi, task.id || '')
          .replace(/{__task_title__}/gi, task.label || '')
          .replace(/{__task_people__}/gi, taskPeople());

    return html;
  }
}

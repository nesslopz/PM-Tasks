import { ExtensionContext, ConfigurationTarget, commands, workspace, window, WebviewPanel, Uri, Disposable, WorkspaceFolder } from 'vscode';

import * as path from 'path';
import * as fs from "fs";
import { Converter as mdConverter } from "showdown";

// JSON Objects for data
import * as Providers from '../providers.json';
import * as Messages from '../messages.json';

// Classes and Utilities
import Provider from '../providers';
import { setProvider, taskListSetting, getCurrentWorkspace } from "../utilities";
import moment = require('moment');
import TasklistProvider from './tasklist.js';

export default function tasksCommands(context: ExtensionContext, tasksProvider:TasklistProvider) {
  /**
   * Webview
   */
  // Track currently webview panel
  let currentPanel: WebviewPanel | undefined = undefined;
  let currentPanelListener: Disposable;
  let currentProvider : Provider | undefined = undefined;
  /**
   * Tasks Commands
   */
  let refreshTasklist = commands.registerCommand('PMTaskList.refreshTasklist', () => tasksProvider.refresh());
  let addTask = commands.registerCommand('PMTaskList.addTask', () => {
    window.showInformationMessage(`New Task into ${currentProvider}`)
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
                window.showInformationMessage(`Task ${ task.id } has been Completed`);
                tasksProvider.refresh(); // Refresh tasklist
                if (currentPanel) // if webview panel is open (it should be) close it
                  currentPanel.dispose();
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
    }
  });
  /**
   * TODO: Edit and Delete tasks
   * Temporally disabled
   *
   * let editTask = commands.registerCommand('PMTask.editTask', task => window.showWarningMessage(`Edit ${ task.label }`))
   * let deleteTask = commands.registerCommand('PMTask.deleteTask', task => window.showErrorMessage(`Delete ${ task.label }`))
   */
  let completeTask = commands.registerCommand('PMTask.completeTask', (task:Task) => {
    task.complete().then(() => {
      window.showInformationMessage(`Task ${ task.label } has been Completed`);
      tasksProvider.refresh();
    });
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

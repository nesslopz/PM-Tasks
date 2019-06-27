import { ExtensionContext, ConfigurationTarget, commands, workspace, window, WorkspaceFolder } from 'vscode';

// JSON Objects for data
import * as Providers from '../providers.json';
import * as Messages from '../messages.json';

// Classes and Utilities
import Provider from '../providers';
import { setProvider, taskListSetting } from "../utilities";

export default function tasksCommands(context: ExtensionContext) {
  /**
   * Tasks Commands
   */

  let refreshTasklist = commands.registerCommand('PMTaskList.refreshTasklist', () => window.showInformationMessage('Refresh tasklist'));
  let addTask = commands.registerCommand('PMTaskList.addTask', () => window.showInformationMessage('New Task'));
  let viewTask = commands.registerCommand('PMTask.viewTask', async (task) => {
    if (task) {
      let taskWebviewPanel = await window.createWebviewPanel("JSON", task.label, { viewColumn: 1 });
      taskWebviewPanel.webview.html = `<pre><code>${ JSON.stringify(task) }</code></pre>`;
    }
  });
  let editTask = commands.registerCommand('PMTask.editTask', task => window.showWarningMessage(`Edit ${ task.label }`))
  let deleteTask = commands.registerCommand('PMTask.deleteTask', task => window.showErrorMessage(`Delete ${ task.label }`))
  let completeTask = commands.registerCommand('PMTask.completeTask', task => window.showInformationMessage(`${ task.label } has been marked as Completed`))

  /**
   * Configurations commands
   */
  // Configure a Project Managment
  const configPM = async () => {
    if (workspace.workspaceFolders) {
      let workspaceFolder: WorkspaceFolder | undefined;
      if (workspace.workspaceFolders.length > 1) {
        // If there's more than 1 folders in workspace, pick one
        workspaceFolder = await window.showWorkspaceFolderPick({
          placeHolder: 'Pick Workspace Folder to configure a Project Managment',
          ignoreFocusOut: true
        });
      }
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
              const project = await window.showQuickPick(
                await provider.getProjects(), {
                  canPickMany: false,
                  matchOnDetail: true,
                  ignoreFocusOut: true,
                  matchOnDescription: true
                })
                .then(async (project) => {
                  if (project) {
                    // Get the configuration for the workspace folder
                    const pmSettings = await workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);
                    // Update the configuration value
                    //await configuration.update('pm.tasksProvider', newValue, workspaceFolder.index );
                    let tasklistSettings = pmSettings.get('taskList', []);
                    let newSettings = [
                      ...tasklistSettings,
                      {
                        projectId: project.id,
                        projectManager: manager.id
                      }
                    ];
                    await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
                    commands.executeCommand('PMTasks.refreshConfigs');
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

  /**
   * Update workspace configuration file, merge id's for same Project Manager
   */
  let refreshConfigs = commands.registerCommand('PMTasks.refreshConfigs', async () => {
    if (workspace.workspaceFolders) {
      if (workspace.workspaceFolders.length > 1) {
        // If there's more than 1 folders in workspace, repeat process
        workspace.workspaceFolders.forEach(async (workspaceFolder) => {
          return await updateConfigEntries(workspaceFolder);
        })
      } else {
        return await updateConfigEntries();
      }
    }
  });

  // Settings
  context.subscriptions.push(configurePM);
  context.subscriptions.push(addNewPM);
  context.subscriptions.push(refreshConfigs);
  // Tasks
  context.subscriptions.push(refreshTasklist);
  context.subscriptions.push(addTask);
  context.subscriptions.push(viewTask);
  context.subscriptions.push(editTask);
  context.subscriptions.push(deleteTask);
  context.subscriptions.push(completeTask);


  /**
   * Update config entries
   */
  const updateConfigEntries = async (workspaceFolder?: WorkspaceFolder) => {
    // Get the configuration for the workspace folder
    const pmSettings = await workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);
    // Update the configuration value
    //await configuration.update('pm.tasksProvider', newValue, workspaceFolder.index );
    let tasklistSettings = pmSettings.get('taskList', []);
    if (tasklistSettings.length > 0) {
      // Remove duplicated values from config
      const newSettings = tasklistSettings.reduce((acumulator:taskListSetting[], project:taskListSetting) => {
        // Search project manager duplicated
        const index = acumulator.findIndex((element: any) => element.projectManager === project.projectManager)
        if (index === -1) {
          // No duplicates, return both
          return [...acumulator, project];
        } else {
          // Duplicated, make a copy
          const acumulatorCopy:any = acumulator;
          // get ID of current project
          const projectId = acumulatorCopy[index].projectId;
          acumulatorCopy[index].projectId =
            [...
              (typeof projectId === 'string' ? [projectId] : projectId),
              project.projectId
            ];
          return acumulatorCopy;
        }
      }, []);
      return await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
    }
  }
}

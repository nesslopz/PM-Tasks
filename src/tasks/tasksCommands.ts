import { ExtensionContext, ConfigurationTarget, Uri, commands, workspace,  window } from 'vscode';
// JSON Objects for data
import Messages from '../messages';
import Providers from '../providers';

// Providers
import Teamwork from '../pm/teamwork';

export function tasksCommands(context: ExtensionContext) {
  /**
   * Configure a Project Managment
   */
  let configurePM = commands.registerCommand('PMTaskList.configure', async () => {
    if (workspace.workspaceFolders) {
      let workspaceFolder;
      if (workspace.workspaceFolders.length > 1) {
        // If there's more than 1 folders in workspace, pick one
        workspaceFolder = await window.showWorkspaceFolderPick({ placeHolder: 'Pick Workspace Folder to configure a Project Managment',  })
      }
      // Get Provider from available list
      const pmProvider = await window.showQuickPick(Providers.map(pm => pm), {
        placeHolder: Messages.helpers.selectPm,
        ignoreFocusOut: true
      });

      if (pmProvider) {
        // Get token for this provider
        let token = await getToken(pmProvider.id);

        // Request token if not exists
        if (!token) {
          // Show help for get token from provider
          let success = await commands.executeCommand('vscode.open', Uri.parse(pmProvider.messages.getToken));

          let newToken = await window.showInputBox({
            ignoreFocusOut: true,
            prompt: Messages.helpers.insertToken
          });

          if (newToken) {
            setToken(pmProvider.id, newToken);
          }

        }

      }
      // Get Project ID
      const projectId = await window.showInputBox({
          ignoreFocusOut: true,
          prompt: Messages.helpers.insertProjectId
        });

      if (pmProvider && projectId) {
        // Get the configuration for the workspace folder
        const pmSettings = workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);

        // Update the configuration value
        //await configuration.update('pm.tasksProvider', newValue, ConfigurationTarget.WorkspaceFolder );
        let taskListSettings = pmSettings.get('taskList', []);
        let newSettings = [
          ...taskListSettings,
          {
          projectId: projectId,
          projectManager: pmProvider.id
        }];
        await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
      }
    } else {
      window.showWarningMessage(Messages.warning.noWorkspace);
    }
  });

  let addTask = commands.registerCommand('PMTaskList.addTask', () => window.showInformationMessage('Create a Task!'));
  let editTask = commands.registerCommand('PMTask.editTask', task => window.showWarningMessage(`Edit ${task.label}`))
  let deleteTask = commands.registerCommand('PMTask.deleteTask', task => window.showErrorMessage(`Delete ${task.label}`))
  let completeTask = commands.registerCommand('PMTask.completeTask', task => window.showInformationMessage(`${task.label} has been marked as Completed`))


  context.subscriptions.push(configurePM);
  context.subscriptions.push(addTask);
  context.subscriptions.push(editTask);
  context.subscriptions.push(deleteTask);
  context.subscriptions.push(completeTask);

  /**
   *
   * @param provider ID of provider
   * @return value | false
   */
  const getToken = async (provider:string) => {
    return await workspace.getConfiguration('pm').get(`${provider}Token`, false);
  }

  /**
   *
   * @param provider ID of provider
   * @param token token for provider
   * @return boolean
   */
  const setToken = async (provider:string, token:string) => {
    return await workspace.getConfiguration('pm').update(`${provider}Token`, token, ConfigurationTarget.Global);
  }

}

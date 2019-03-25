import { ExtensionContext, ConfigurationTarget, Uri, commands, workspace,  window } from 'vscode';
// JSON Objects for data
import Messages from '../messages';
import Providers, { Provider } from '../providers';

// Providers
import Teamwork from '../pm/teamwork';

export function tasksCommands(context: ExtensionContext) {

  /**
   * Tasks Commands
   */
  let getTasks = commands.registerCommand('PMTaskList.getTasks', () => window.showInformationMessage('Get All Tasks!'));
  let addTask = commands.registerCommand('PMTaskList.addTask', () => window.showInformationMessage('Create a Task!'));
  let editTask = commands.registerCommand('PMTask.editTask', task => window.showWarningMessage(`Edit ${task.label}`))
  let deleteTask = commands.registerCommand('PMTask.deleteTask', task => window.showErrorMessage(`Delete ${task.label}`))
  let completeTask = commands.registerCommand('PMTask.completeTask', task => window.showInformationMessage(`${task.label} has been marked as Completed`))

  /**
   * Configurations commands
   */
    // Configure a Project Managment
  let configurePM = commands.registerCommand('PMTaskList.configure', async () => {
    if (workspace.workspaceFolders) {
      let workspaceFolder;
      if (workspace.workspaceFolders.length > 1) {
        // If there's more than 1 folders in workspace, pick one
        workspaceFolder = await window.showWorkspaceFolderPick({ placeHolder: 'Pick Workspace Folder to configure a Project Managment',  })
      }
      // Get Provider from available list
      const pmProvider = await window.showQuickPick(Providers, {
        placeHolder: Messages.helpers.selectPm,
        ignoreFocusOut: true
      });

      if (pmProvider) {

        const provider = new Provider(pmProvider.id);


        // Get token for this provider
        let token:string|boolean = await provider.getToken();

        // Request token if not exists
        if (!token) {
          // Show help for get token from provider
          await commands.executeCommand('vscode.open', Uri.parse(pmProvider.messages.getToken));

          let newToken = await window.showInputBox({
            ignoreFocusOut: true,
            prompt: Messages.helpers.insertToken
          });

          if (newToken) {
            await provider.setToken(newToken);
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
          }
        ];
        await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
        commands.executeCommand('PMTasks.refreshConfigs');
      }
    } else {
      window.showWarningMessage(Messages.warning.noWorkspace);
    }
  });

  commands.registerCommand('PMTasks.refreshConfigs', async() => {
    if (workspace.workspaceFolders) {
      let workspaceFolder;
      if (workspace.workspaceFolders.length > 1) {
        // If there's more than 1 folders in workspace, repeat process
        for (workspaceFolder in workspace.workspaceFolders) {
          await updateConfigEntries(workspaceFolder);
        }
      }
      await updateConfigEntries();
    }
  });

  context.subscriptions.push(configurePM);
  context.subscriptions.push(getTasks);
  context.subscriptions.push(addTask);
  context.subscriptions.push(editTask);
  context.subscriptions.push(deleteTask);
  context.subscriptions.push(completeTask);


  /**
   * Update config entries
   */
  const updateConfigEntries = async (workspaceFolder?:any) => {
    // Get the configuration for the workspace folder
    const pmSettings = workspace.getConfiguration('pm', workspaceFolder ? workspaceFolder.uri : null);
    // Update the configuration value
    //await configuration.update('pm.tasksProvider', newValue, ConfigurationTarget.WorkspaceFolder );
    let taskListSettings = pmSettings.get('taskList');
    if (Array.isArray(taskListSettings)) {
      // Remove duplicated values from config
      const newSettings = taskListSettings.reduce((acumulator, project) => {
        const index = acumulator.findIndex((element:any) => element.projectManager === project.projectManager)
        if (index === -1) {
          return [...acumulator, project]
        } else {
          const acumulatorCopy = acumulator
          const projectId = acumulatorCopy[index].projectId
          acumulatorCopy[index].projectId = [...(typeof projectId === 'string' ? [projectId] : projectId), project.projectId]
          return acumulatorCopy
        }
      }, [])
      return await pmSettings.update('taskList', newSettings, workspaceFolder ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Workspace);
    }
  }
}

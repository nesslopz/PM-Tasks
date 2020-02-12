import Teamwork from './pm/teamwork';
import Provider, { Manager, ProjectItem } from './providers';
import { QuickPickItem, workspace, WorkspaceFolder, window } from 'vscode';

/**
 * Set a Provider to extenstion context
 * @param manager JSON object
 * @returns Provider
 */
export const setProvider = (manager: Manager):Provider => {
  let provider: Provider;
  switch (manager.id) {
    case 'teamwork':
      provider = new Teamwork(manager);
      break;
    default:
      provider = new Provider(manager);
      break;
  }
  return provider;
}

export const getCurrentWorkspace = async () => {
  if (!workspace.workspaceFolders)
    return;
  else {
    let workspaceFolder: WorkspaceFolder | undefined;
    if (workspace.workspaceFolders.length > 1) {
      // If there's more than 1 folders in workspace, pick one
      workspaceFolder = await window.showWorkspaceFolderPick({
        placeHolder: 'Pick Workspace Folder to configure a Project Manager',
        ignoreFocusOut: true
      });
    } else {
      workspaceFolder = workspace.workspaceFolders[0];
    }
    return workspaceFolder;
  }
}

/**
 * Converts params object to query string
 * @param params { key: "value" }
 * @returns queried string
 */
export const queryParams = (params:any):string => {
  if (!params || Object.keys(params).length === 0)
    return '';
  return '?' + Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

/**
 * TaskList Setting interface
 */
export interface taskListSetting extends QuickPickItem {
  id             : ProjectItem["id"];
  label          : ProjectItem["label"];
  projectManager : Manager["id"];
  projectId     ?: ProjectItem["id"];
  projectName   ?: ProjectItem["label"];
}
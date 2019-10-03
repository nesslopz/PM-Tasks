import {
  commands,
  window,
  Event,
  EventEmitter,
  TreeItem,
  TreeDataProvider,
  workspace,
  WorkspaceConfiguration
} from 'vscode';

// JSON
import * as Providers from '../providers.json';
import * as Messages from '../messages.json';

// Classes
import Provider from '../providers';
import Task, { ItemMessage } from './tasks';

// Utilities
import { setProvider } from "../utilities";

export default class TasklistProvider implements TreeDataProvider<Task> {

	private _onDidChangeTreeData: EventEmitter<Task | undefined> = new EventEmitter<Task | undefined>();
  readonly onDidChangeTreeData: Event<Task | undefined> = this._onDidChangeTreeData.event;
  private warningCounter:number = 0;
  public providers:Provider[] = [];

	constructor(private pmSettings: WorkspaceConfiguration) {
    workspace.onDidChangeConfiguration(changed => {
      // let initialSettings = this.pmSettings;
      if (changed.affectsConfiguration('pm')) {
        this.pmSettings = workspace.getConfiguration('pm', null);
        this.validateConfig();
        this.refresh();
      }
    });
  }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Task): TreeItem {
    return element;
	}

	getChildren(taskChild?: Task): Thenable<Task[]> {
    if (workspace.workspaceFolders) {

      const isConfigured = this.validateConfig();

      if (!isConfigured) {
        // Return item with message and configure command
        return Promise.resolve([
          new ItemMessage(Messages.warning.noSettings, 'info',
          {
            title: "config",
            command: "PMTaskList.config",
            tooltip: Messages.helpers.configure
          })
        ]);
      }

      if (this.providers.length > 0) {
        return new Promise((resolve, reject) => {
          // Iterate providers
          this.providers.reduce(async (previosTasklist:Promise<Task[]>, currentProvider:Provider) => {
            let taskList = await previosTasklist;
            // Get tasks of current provider
            let newTasks = await currentProvider.getTasks(taskChild);
            if (newTasks) {
              taskList = [...taskList, ...newTasks];
            }
            return taskList;
          }, Promise.resolve([]))
          .then(allTasks => {
            if (allTasks.length > 0) {
              /**
               * Return tasks
               */
              resolve(allTasks);
            } else {
              /**
               * Return message of empty tasks
               */
              resolve([new ItemMessage(Messages.helpers.noTasks)]);
            }
          })
          .catch(err => {
            resolve([new ItemMessage(Messages.helpers.emptyTasks)]);
          });
        });
      } else {
        /**
         * Return message of empty tasks
         */
        return Promise.resolve([
          new ItemMessage(Messages.helpers.noTasks)
        ]);
      }


    } else {
      // There is no workspace or folder open
      return Promise.resolve([
        new ItemMessage(Messages.warning.noWorkspace, 'info',
        {
          command: 'vscode.openFolder',
          title: 'Open'
        })
      ]);
    }

  }

  /**
   * Validate extension configuration
   *
   * @returns bool
   */
  validateConfig() {
    const tasklistSettings = this.pmSettings.get('taskList');

    let isConfigured = false;
    if (
        !Array.isArray(tasklistSettings) ||
        (Array.isArray(tasklistSettings) &&
          (tasklistSettings.length === 0 || tasklistSettings[0].projectId === "")
        )
      ) {
      // There is no Project configured or not in the correct way
      if (this.warningCounter < 1) {
        window.showWarningMessage(Messages.warning.noSettings, Messages.helpers.configure)
          .then(async (action) => {
            if (action === Messages.helpers.configure) {
              commands.executeCommand('PMTaskList.config');
            }
          });
        this.warningCounter++;
      }
      isConfigured = false;
    } else {
      // Reset providers
      this.providers = [];
      // get all providers names without duplicates
      let managerList = Array.from(new Set(tasklistSettings.map(project => project.projectManager)));
      // Initialize manager
      managerList.map(id => {
        // Get only the requested manager
        const manager = Providers.reduce((previous:any, current:any) => current.id === id ? current : {id: ""}, {id: ""});
        this.providers.push(setProvider(manager));
      });
      isConfigured = true;
    }
    commands.executeCommand('setContext', 'isProjectConfigured', isConfigured);
    return isConfigured;
  }

}
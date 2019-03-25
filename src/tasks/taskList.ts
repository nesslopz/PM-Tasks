import {
  commands,
  window,
  Command,
  Event,
  EventEmitter,
  TreeItem,
  TreeDataProvider,
  TreeItemCollapsibleState,
  workspace,
  WorkspaceConfiguration
} from 'vscode';

import * as path from 'path';

import Messages from '../messages';
import { Provider } from '../providers';

export class TaskListProvider implements TreeDataProvider<Task> {

	private _onDidChangeTreeData: EventEmitter<Task | undefined> = new EventEmitter<Task | undefined>();
	readonly onDidChangeTreeData: Event<Task | undefined> = this._onDidChangeTreeData.event;
  public providers:any = [];

	constructor(private pmSettings: WorkspaceConfiguration) {
    workspace.onDidChangeConfiguration(changed => {
      // let initialSettings = this.pmSettings;
      if (changed.affectsConfiguration('pm')) {
        this.pmSettings = workspace.getConfiguration('pm');
        this.validateConfig()
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

	getChildren(element?: Task): Thenable<Task[]> {

    if (workspace.workspaceFolders) {

      const isConfigured = this.validateConfig();

      if (!isConfigured) {
        // Return item with message and configure command
        return Promise.resolve([
          new ItemMessage(Messages.warning.noSettings, { messageType: 'urgent' }, TreeItemCollapsibleState.None,
          {
            title: "config",
            command: "PMTaskList.configure",
            tooltip: Messages.helpers.configure
          })
        ]);
      }

      // const tasks = [...this.providers.map(provider => provider.getTasks())]
      let tasks:any = [];

      if (tasks) {
       /**
       * Return tasks
       */
        return Promise.resolve(tasks);
      } else {
        /**
         * Return message of empty tasks
         */
        return Promise.resolve([
          new ItemMessage(Messages.helpers.noTasks, { messageType: 'none' }, TreeItemCollapsibleState.None,
          {
            command: 'vscode.open',
            tooltip: Messages.helpers.emptyTasks,
            title: 'Open'
          })
        ]);
      }


    } else {
      // There is no workspace or folder open
      return Promise.resolve([
        new ItemMessage(Messages.warning.noWorkspace, { messageType: 'none' }, TreeItemCollapsibleState.None,
        {
          command: 'vscode.openFolder',
          tooltip: '',
          title: 'Open'
        })
      ]);
    }

  }

  validateConfig() {
    const taskListSettings = this.pmSettings.get('taskList');

    let isConfigured;
    if (
        !Array.isArray(taskListSettings) ||
        (Array.isArray(taskListSettings) &&
          (taskListSettings.length === 0 || taskListSettings[0].projectId === "")
        )
      ) {
      // There is no Project configured or not in the correct way
      window.showWarningMessage(Messages.warning.noSettings);
      isConfigured = false;
    } else {
      // get all managers names without duplicates
      let managerList = Array.from(new Set(taskListSettings.map(project => project.projectManager)));
      // Initialize provider
      managerList.map(manager => {
        this.providers.push(new Provider(manager));
      });
      isConfigured = true;
    }
    commands.executeCommand('setContext', 'isProjectConfigured', isConfigured);
    return isConfigured;
  }

}

export class Task extends TreeItem {

	constructor(
    public readonly title: string,
    public readonly data: TaskData,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly command?: Command
	) {
		super(title, collapsibleState);
	}

	get tooltip(): string {
    let title = this.title;
    let date = this.data.date ? `[${this.data.date}]` : '';
    let who = this.data.who ? `${this.data.who}` : '';

    return `${title} ${date} ${who}`;
	}

	get description(): string {
		return `${this.data.date ? this.data.date : ''}`;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'dot.svg'),
    dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'dot.svg')
  };

	contextValue = 'task';
}

export class ItemMessage extends Task {

	get tooltip(): string {
    return `${this.command ? this.command.tooltip : this.title}`;
	}

	get description(): string {
		return '';
  }

  iconPath = {
    light: path.join(__filename, '..', '..', '..', 'resources', 'light', (this.data.messageType ? this.data.messageType : 'dot') + '.svg'),
    dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', (this.data.messageType ? this.data.messageType : 'dot') + '.svg')
  };

	contextValue = 'itemMessage';
}


interface TaskData {
  date?: any;
  who?: string;
  messageType?: string;
}
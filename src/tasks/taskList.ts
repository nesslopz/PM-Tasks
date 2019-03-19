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
//import teamworkProvider from '../pm/teamwork';

export class TaskListProvider implements TreeDataProvider<Task> {

	private _onDidChangeTreeData: EventEmitter<Task | undefined> = new EventEmitter<Task | undefined>();
	readonly onDidChangeTreeData: Event<Task | undefined> = this._onDidChangeTreeData.event;

	constructor(private pmSettings: WorkspaceConfiguration) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Task): TreeItem {
    return element;
	}

	getChildren(element?: Task): Thenable<Task[]> {

    let projectId = this.pmSettings.get('projectId');
    console.log(projectId);
    if (!projectId || (Array.isArray(projectId) && projectId.length === 0)) {
      window.showWarningMessage(Messages.warning.noSettings);

      return Promise.resolve([new ItemMessage(Messages.warning.noSettings, { messageType: 'urgent' }, TreeItemCollapsibleState.None, {
        title: "config",
        command: "PMTaskList.configure",
        tooltip: "string"
      })]);
		}

    return Promise.resolve(
      [
        new Task('Task 1', {date: 'date', who: 'who'}, TreeItemCollapsibleState.None),
        new Task('Task 1', {date: 'date', who: 'who'}, TreeItemCollapsibleState.None),
        new Task("--Task 1--", {date: 'date', who: 'who'}, TreeItemCollapsibleState.None),
        new Task("~~Task final~~", {date: 'date', who: 'who'}, TreeItemCollapsibleState.None)
      ]
    );

		// if (element) {
    //   if (element.hasChildrens) {
    //     return Promise.resolve([new Task('Title', 'date', 'who', TreeItemCollapsibleState.Collapsed)]);
    //   } else {
    //     return Promise.resolve([new Task('Title Uncollapsed', 'date', 'who', TreeItemCollapsibleState.None)]);
    //   }
		// } else {
    //   window.showInformationMessage('No element');
    //   return Promise.resolve([new Task('Title Uncollapsed', 'date', 'who', TreeItemCollapsibleState.None)]);
		// }

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
    let who = this.data.who ? `@${this.data.who}` : '';

    return `${title} ${date} ${who}`;
	}

	get description(): string {
		return `${this.data.date ? this.data.date : ''}`;
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', (this.data.messageType ? this.data.messageType : 'date'), '.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', (this.data.messageType ? this.data.messageType : 'date'), '.svg')
  // };

  iconPath = {
    light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'dot.svg'),
    dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'dot.svg')
  };

	contextValue = 'task';
}

export class ItemMessage extends Task {

	get tooltip(): string {
    return `${this.title}`;
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
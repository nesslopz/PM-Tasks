import {
  Command,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';

import * as path from 'path';
import * as moment from 'moment';
import Provider, { ProjectItem } from '../providers';

export default class Task extends TreeItem {

  public readonly data ?: TaskData;

	constructor(
    private item: TaskItem,
	) {
    super(item.title);
    if (this.item && this.item.id) {
      this.id = this.item.id;
    }
    if (this.item.hasChildren) {
      this.collapsibleState = TreeItemCollapsibleState.Collapsed;
      this.contextValue = 'parentTask';
    } else {
      this.collapsibleState = TreeItemCollapsibleState.None;
      this.command = {
        title: 'View Task Details',
        command: 'PMTask.viewTask',
        arguments: [this]
      };
    }

    /**
     * Task Data
     */
    this.data = this.item.data;
  }

  /**
   * Formatted date to human-readable string
   */
  private get date(): string {
    let { date } = this.item;
    if (date) {
      date = moment(date).calendar(moment.now(), {
        sameDay : '[Today]',
        nextDay : '[Tomorrow]',
        lastDay : '[Yesterday]',
        nextWeek: 'dddd',
        lastWeek: `[❗${moment(date).fromNow()}]`,
        sameElse: 'DD/MM/YY'
      });
      return date;
    }
    return '';
  }

	get tooltip(): string {
    let { who } = this.item;

    /**
     * Task title
     * [date] assigned
     */
    return `${this.item.title}\n${this.date !== '' ? `[${this.date}] ` : ''}${who}`;
  }

	get description(): string {
		return this.date;
  }

  get icon(): string {
    let icon;

    switch (this.item.type) {
      case 'urgent':
        icon = 'issues';
        break;
      case 'important':
        icon = 'warning'
        break;
      case 'prohibited':
        icon = 'error'
        break;
      case 'normal':
      default:
        icon = 'circle-outline';
        break;
    }
    return icon;
  }

  /**
   * Mark this task as completed
   * >Use **Provider** to edit this action
   */
  async complete() {
    if (this.item.provider) {
      return await this.item.provider.completeTask(this.id);
    }
  }

  // Show icon or arrow only if hasChildren
  iconPath = !this.item.hasChildren ? {
    light: path.join(__filename, '..', '..', '..', 'resources', 'light', `${this.icon}.svg`),
    dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', `${this.icon}.svg`)
  } : undefined;

  contextValue = 'task';
}


export class ItemMessage extends Task {

  constructor(
    public readonly title  : string,
    public readonly type   ?: "error"|"warning"|"info",
    public readonly command?: Command
  )
  {
    super({ title: title, type: type, hasChildren: false });
  }

  get icon(): string {
    let icon;
    switch (this.type) {
      case 'error':
        icon = 'error';
        break;
      case 'warning':
        icon = 'warning'
        break;
      case 'info':
      default:
        icon = 'issues';
        break;
    }
    return icon;
  }

	get tooltip(): string {
    return `${this.command ? this.command.tooltip : this.title}`;
	}

	get description() {
		return '';
  }

	contextValue = 'itemMessage';
}

export interface TaskItem {
  title        : string,
  provider    ?: Provider,
  id          ?: string,
  date        ?: string|number|Date;
  who         ?: string;
  type        ?: "urgent"|"important"|"normal"|"prohibited"|string;
  hasChildren ?: boolean;
  data        ?: TaskData;
}

interface TaskData {
  start         ?: string|number|Date;
  end           ?: string|number|Date;
  people        ?: TaskUser[]|string;
  project       ?: ProjectItem|string|number;
  progress      ?: string|number;
  description   ?: string;
  estimatedTime ?: string|number;
  comments      ?: string|number;
  private       ?: boolean;
  status        ?: string;
  creator       ?: TaskUser;
  lastChanged   ?: string|number|Date;
  subTasks      ?: Task[];
}

interface TaskUser {
  id        ?: string|number;
  firstName ?: string;
  lastName  ?: string;
  fullName  ?: string;
  avatar    ?: string;
}
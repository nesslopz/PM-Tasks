import { workspace, WorkspaceConfiguration, ConfigurationTarget, Uri, commands, window, QuickPickItem } from 'vscode';
import { xhr } from 'request-light';

import Task from './tasks/tasks';
import { queryParams, taskListSetting } from './utilities';

import * as Messages from './messages.json';
/**
 * Taskslist provider
 */
export default class Provider {
  protected pmSettings:WorkspaceConfiguration;

  public id            : Manager['id'];
  public responseType ?: Manager['responseType'];
  public routes       ?: Manager["routes"]|any;
  public endpoints    ?: Manager['endpoints']|any;
  public helpers      ?: Manager['helpers']|any;
  public messages     ?: Manager['messages']|any;

  public projects : ProjectItem[];

  private _user ?: any;
  private defaultURL : string = "";

  constructor(manager:Manager) {
    this.pmSettings = workspace.getConfiguration('pm', null);

    Object.assign(this, manager);
    this.id = manager.id;

    this.projects = this.pmSettings.get('taskList', [])
      // Get only project ID of this Provider
      .filter((tasklist:any) => tasklist.projectManager == this.id)
      // Get the array of Project Items
      .reduce( (current:ProjectItem[], tasklist:any) => {
        return [
          ...current,
          {
            id: tasklist.projectId,
            label: tasklist.projectName,
          }
        ]
      }, []);

    workspace.onDidChangeConfiguration(changed => {
      if (changed.affectsConfiguration('pm.taskList')) {
        this.pmSettings = workspace.getConfiguration('pm', null);
        // Get Projects
        this.projects = this.pmSettings.get('taskList', [])
        // Get the array of Project Items
        .reduce( (current:ProjectItem[], tasklist:any) => {
          return [
            ...current,
            {
              id: tasklist.projectId,
              label: tasklist.projectName
            }
          ]
        }, []);
      }
    });
  }

  /**
   * @returns Provider.user
   */
  get user() {
    return this._user;
  }

  /**
   * User data
   */
  set user(user) {
    this._user = user;
  }

  /**
   * @returns Provider.url
   */
  get url():string {
    return this.defaultURL;
  }

  /**
   * Url for fetch
   */
  set url(url:string) {
    this.defaultURL = url;
  }

  /**
   * Get list of Projects
   * @returns array of ProjectItems
   */
  public async getProjects():Promise<ProjectItem[]> {
    return [];
  }

  /**
   * Get tasklist if Project Manager works this way
   * @returns array of ProjectItems
   */
  public async getTaskLists():Promise<ProjectItem[]> {
    return this.getProjects();
  }

  /**
   * Get list of Tasks
   * @returns array
   */
  public async getTasks(task?:Task):Promise<Task[]> {
    return [];
  }

  /**
   * Create a Task in Provider
   * @param taskListID ID of taskList
   * @param content taskContent
   */
  public async createTask(taskListID:taskListSetting['id'], content:any):Promise<Task|boolean> {
    return true;
  }

  /**
   * Complete a task
   * @param id Task ID to complete
   * @returns _Promise_
   */
  public async completeTask(id:Task["id"]):Promise<any> {
    return;
  }


  /**
   * Get People from
   * @param type Type of search
   * @param id Project ID or Tasklist ID
   * @returns TaskData["people"]
   */
  public async getPeople(tasklist:taskListSetting):Promise<Person[]> {
    return [];
  }

  /**
   *
   * @param provider ID of provider
   * @returns value || ''
   */
  async getToken (provider?:string):Promise<string> {
    let token = await workspace.getConfiguration('pm', null).get(`${provider ? provider : this.id}Token`, '');

    // Request token if not exists
    if (!token)
      token = await this.updateToken();

    return token;
  }

  /**
   *
   * @param provider ID of provider
   * @param token token for provider
   * @returns boolean
   */
  async setToken (token:string):Promise<void> {
    if (!this.id)
      return;

    return await workspace.getConfiguration('pm', null).update(`${this.id}Token`, token, ConfigurationTarget.Global);
  }

  async updateToken():Promise<string> {

    // Show help for get token from provider
    await commands.executeCommand('vscode.open', Uri.parse(this.helpers.getToken));

    // Read token
    let newToken = await window.showInputBox({
      ignoreFocusOut: true,
      prompt: Messages.helpers.insertToken
    });

    // Return empty
    if (!newToken)
      return '';

    // Update in configuration
    await this.setToken(newToken);
    // Return newToken inserted
    return newToken;

  }

  /**
   * HTTP requests wrapper
   * @param url URL to request
   * @param options XHROptions
   */
  async fetch(
    url:string,
    {
      method = "GET",
      body,
      user,
      password,
      base   = this.url,
      useSSL = false,
      params = {}
    } :
    {
      method   ?: string,
      body     ?: object,
      user     ?: string,
      password ?: string,
      base     ?: string,
      useSSL   ?: boolean,
      params   ?: any
    } = {}
    ) {
    const response = await xhr({
      type        : method,
      url         : Uri.parse( base + url ).toString() + queryParams(params),
      user        : user || this.user.username,
      password    : password || this.user.password,
      strictSSL   : useSSL,
      responseType: this.responseType,
      data        : JSON.stringify(body)
    })
    .then(res => JSON.parse(res.responseText))
    .catch(err => JSON.parse(err.responseText));

    if (!response)
      return false;

    if (
        response.STATUS == "OK" ||
        response.STATUS == "ok" ||
        response.STATUS == "Ok" ||
        response.status == "OK" ||
        response.status == "ok" ||
        response.status == "Ok"
      ) {
        // Get Keys from received object
        let keys = Object.keys(response)
                          // Remove key "STATUS"
                         .filter(key => key !== ("STATUS" || "status"));
        if (keys.length > 1) {
          let responseObj:any = {};
          keys.map(key => responseObj[key] = response[key]);
          return responseObj;
        } else {
          return response[keys[0]];
        }
      } else {
        throw response;
      }
  }

}

export interface Manager {
  id: string,
  label: string,
  description?: string,
  defaultURL?: string,
  responseType: string,
  routes: {
    auth: string
    projects: {
      all: string,
      single: string
    },
    tasklists: {
      all: string,
      single: string,
      project: string,
    },
    tasks: {
      all: string,
      single: string,
      project: string,
      tasklist: string,
      subtasks: string
    }
  },
  endpoints: {
    complete: {
      url: string,
      method: string
    },
    uncomplete: {
      url: string,
      method: string
    },
    update: {
      url: string,
      method: string
    },
    delete: {
      url: string,
      method: string
    }
  },
  helpers: any,
  messages: {
    success ?: any,
    warning ?: any;
    error   ?: any;
    actions ?: any;
  }
}

export interface ProjectItem extends QuickPickItem {
  id   : string,
  name?: string
}

export interface Person extends QuickPickItem {
  id     : string,
  alias ?: string
}

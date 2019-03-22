import { workspace, WorkspaceConfiguration, ConfigurationTarget } from 'vscode';
import { Task } from './tasks/taskList';

export const providerList = [
  {
    id: "teamwork",
    label: "Teamwork",
    description: "teamwork.com | Working together. Beautifully",
    url: "",
    response: "json",
    routes: {
      auth: "https://api.teamwork.com/authenticate.json",
      projects: {
        all: "/projects.json",
        single: "/projects/{id}.json",
      },
      tasklists: {
        all: "/tasklists.json",
        single: "/tasklists/{id}.json",
        project: "/projects/{id}/tasklists.json",
      },
      tasks: {
        all: "/tasks.json",
        single: "/tasks/{id}.json",
        project: "/projects/{id}/tasks.json",
        tasklist: "/tasklists/{id}/tasks.json",
        subtasks: "/tasks/{parentTaskId}/subtasks.json",
      },
      actions: {
        complete: "/tasks/{id}/complete.json",
        uncomplete: "/tasks/{id}/uncomplete.json",
        update: "/tasks/{id}.json",
        delete: "/tasks/{id}.json"
      }
    },
    messages: {
      getToken: "https://support.teamwork.com/projects/using-teamwork-projects/locating-your-api-key",
      openProject: "openProject"
    }
  }
];

export class Provider {
  private user:any;
  private pmSettings:WorkspaceConfiguration = workspace.getConfiguration('pm');
  public manager: any;

  constructor(public id?:string) {
    this.manager = providerList.reduce((others, provider) => (provider.id || '') === this.id ? provider : {}, {})
    workspace.onDidChangeConfiguration(changed => {
      if (changed.affectsConfiguration('pm')) {
        this.pmSettings = workspace.getConfiguration('pm');
      }
    });
  }

  /**
   * Get list of tasks
   */
  async getTasks() {
    if (!this.user)
      this.user = await this.getUser();

    return await [
      new Task('taskName', {date: '20190818', who: 'somebody'}, 0)
    ];
  }

  /**
   * @return Provider.user
   */
  async getUser() {
    // User exists
    if (this.user) return this.user;
    // Check if manager has been defined
    if (!this.manager.id) {
      return;
    }
  }

  /**
   *
   * @param provider ID of provider
   * @return value | false
   */
  async getToken (provider:string|undefined) {
    return await workspace.getConfiguration('pm').get(`${provider ? provider: this.manager.id}Token`, false);
  }

  /**
   *
   * @param provider ID of provider
   * @param token token for provider
   * @return boolean
   */
  async setToken (provider:string, token:string) {
    return await workspace.getConfiguration('pm').update(`${provider}Token`, token, ConfigurationTarget.Global);
  }

  /**
   *
   * @param key key for message
   * @return value
   */
  getMessage(key:string): string {
    return this.manager.messages ? this.manager.messages[key] : '';
  }
}

export default providerList;
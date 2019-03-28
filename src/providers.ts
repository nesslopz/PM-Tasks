import { workspace, WorkspaceConfiguration, ConfigurationTarget } from 'vscode';
import { TaskItem } from './tasks/taskList';

export const providerList:ProviderItem[] = [
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
    },
    actions: {
      complete: {
        url: "/tasks/{id}/complete.json",
        method: "GET"
      },
      uncomplete: {
        url: "/tasks/{id}/uncomplete.json",
        method: "GET"
      },
      update: {
        url: "/tasks/{id}.json",
        method: "GET"
      },
      delete: {
        url: "/tasks/{id}.json",
        method: "GET"
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
  private pmSettings:WorkspaceConfiguration;
  public manager:ProviderItem|any;

  constructor(public id?:string) {
    this.manager = providerList.reduce((others, provider) => (provider.id || '') === this.id ? provider : {}, {})
    this.pmSettings = workspace.getConfiguration('pm');
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
      {
        id: '123',
        title: 'Nueva tarea',
        data: {
          who: 'néstor',
          date: 'tomorrow'
        }
      }
    ]);
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
  async getToken (provider?:string) {
    return await workspace.getConfiguration('pm').get(`${provider ? provider : this.manager.id}Token`, false);
  }

  /**
   *
   * @param provider ID of provider
   * @param token token for provider
   * @return boolean
   */
  async setToken (token:string) {
    if (this.manager.id) {
      return await workspace.getConfiguration('pm').update(`${this.manager.id}Token`, token, ConfigurationTarget.Global);
    }
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

interface ProviderItem {
  id: string,
  label: string,
  description?: string,
  url?: string,
  response: string,
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
  actions: {
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
  messages: any
};

export default providerList;
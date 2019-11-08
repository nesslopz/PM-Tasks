import Provider, { ProjectItem, Manager } from '../providers';

import { window, workspace } from 'vscode';
import Task, { ItemTaskList } from '../tasks/tasks';
import { taskListSetting } from '../utilities';

export default class Teamwork extends Provider {

  private tasklists: taskListSetting[] = this.pmSettings.get('taskList', []);

  constructor(manager:Manager) {
    super(manager);

    workspace.onDidChangeConfiguration(changed => {
      if (changed.affectsConfiguration('pm.taskList')) {
        this.pmSettings = workspace.getConfiguration('pm', null);
        // Get Projects
        this.tasklists = this.pmSettings.get('taskList', []);
      }
    });
  }

  async getProjects():Promise<ProjectItem[]> {
    if (!this.user)
      await this.register();

    const projects = await this.fetch(this.routes.projects.all);
    if (projects) {
      return projects.map((project:any):ProjectItem => {
        return {
          id         : project.id,
          label      : `${project.starred ? "$(star)" : ""} ${project.name}`,
          description: `${project.company ? project.company.name : ''}`,
          name       : project.name
        }
      });
      //
      // No more filter (in Teamwork use Takslist instead and filter them)
      //
      // .filter((project:ProjectItem) => {
      //   // Get only projects are not in current workspace
      //   return this.projects.findIndex((proj) => proj.id === project.id) === -1;
      // });
    }
    return [];
  }

  async getTasks(task?:Task):Promise<Task[]> {
    if (!this.user)
      await this.register();

    return new Promise((resolve, reject) => {
      // Iterate in ID Projects and return just one Array with all Tasks
      if (task) {
        if (task.data && task.data.subTasks) {
          resolve(task.data.subTasks);
        } else {
          let getSubtasks = this.routes.tasks.subtasks;
              getSubtasks = getSubtasks.replace('{id}', task.id);

          this.fetch(getSubtasks, {
            params: {
              sort: this.pmSettings.get('sortBy')
            }
          })
            .then(subTasks => {
              if (subTasks) {
                resolve(subTasks.map( (task:any) => this.teamworkTask(task) ));
              }
            })
        }
      } else {
        this.tasklists.reduce(async (previousProjectTasks:Promise<Task[]>, tasklist) => {
          // Wait for promise
          let currentProjectTasks = await previousProjectTasks;
          // Validate Project ID
          if (tasklist.id && tasklist.id.length > 0) {

            let route = this.routes.tasks.tasklist;
            route = route.replace('{id}', tasklist.id);
            // Request Project Tasks
            const projectTasks = await this.fetch(route, {
              params: {
                // Get subtasks
                "nestSubTasks"         : this.pmSettings.get('nestSubTasks') ? "yes" : "no",
                // Pre-sort by setting choice
                "sort"                 : this.pmSettings.get('sortBy'),
                // return "Mine" * Tasks
                "responsible-party-ids": this.pmSettings.get('onlyMine') ? this.user.userId : "-1",
              }
            });

            if (projectTasks) {

              if (this.pmSettings.get('groupTasksByProject')) {
                // Update Project Tasks array
                currentProjectTasks = [
                  ...currentProjectTasks,
                  ...[new ItemTaskList( tasklist, projectTasks.map( this.teamworkTask, this ) ) ]
                ];
              } else {
                currentProjectTasks = [
                  ...currentProjectTasks,
                  ...projectTasks.map( this.teamworkTask, this ) // Convert to teamworkTask
                ];
              }

            }
          }
          // Return array mixed
          return currentProjectTasks;

        }, Promise.resolve([]) )
          .then(allTasks => {
            /* allTasks = allTasks.sort((t1, t2) => {
              if (t1.data && t2.data) {
                if (!t1.data.end) return 1
                if (!t2.data.end) return 0
                return t1.data.end > t2.data.end ? 1 : -1;
              }
              return 0;
            });
            console.log(allTasks.map(task => `${task.id}: [${task.data ? task.data.end : ''}] ${task.label}`)); */
            resolve(allTasks);
          });
      }

    });
  }


  /**
   * Get QuickPickItems with TaskList data
   * shows a Project selector first
   * @returns taskListSetting[]
   */
  async getTaskLists():Promise<taskListSetting[]> {
    return new Promise(async (resolve, reject) => {
      // Create a custom QuickPick selector to show progress while getting data
      let quickPickTaskList                    = window.createQuickPick();
          quickPickTaskList.busy               = true;
          quickPickTaskList.enabled            = false;
          quickPickTaskList.canSelectMany      = false;
          quickPickTaskList.matchOnDetail      = true;
          quickPickTaskList.ignoreFocusOut     = true;
          quickPickTaskList.matchOnDescription = true;

      quickPickTaskList.show(); // Show while loading data

      // Get projects list
      const projectsList = await this.getProjects();
      if (projectsList) {
        quickPickTaskList.items = projectsList;
        // ⬆️ Fill projects and enable selection ⬇️
        quickPickTaskList.busy    = false;
        quickPickTaskList.enabled = true;

        // Listen for selection
        quickPickTaskList.onDidChangeSelection(async (projects:any[]) => {
          // Show loader
          quickPickTaskList.items   = [];
          quickPickTaskList.busy    = true;
          quickPickTaskList.enabled = false;

          const project = projects[0];
          if (project && project.id) {
            // Get tasklists
            let tasklistUrl = this.routes.tasklists.project;
                tasklistUrl = tasklistUrl.replace('{id}', project.id);

            let tasklists = await this.fetch(tasklistUrl);
            if (tasklists) {
              // Iterate with Teamwork tasklist object and return as QuickPickItem
              tasklists = tasklists.map((tasklist:any):taskListSetting => {
                return {
                  id            : tasklist.id,
                  label         : tasklist.name,
                  description   : `${tasklist.description} (${tasklist["uncompleted-count"]} Tasks)`,
                  projectManager: this.id,
                  projectId     : tasklist.projectId,
                  projectName   : tasklist.projectName
                }
              }).filter((tasklist:ProjectItem) => {
                // Show only tasklist are not in current workspace
                return this.tasklists.findIndex((tlist) => tasklist.id === tlist.id) === -1;
              });

              if (tasklists.length > 0) {
                // Return tasklists
                resolve(tasklists);
              } else {
                quickPickTaskList.items   = [
                  {
                    label: "",
                    description: `No more taskslist in ${project.name}, choose another Project or press {ESC}`,
                  },
                  ...quickPickTaskList.items = projectsList.filter(proj => proj.id !== project.id)
                ];
                quickPickTaskList.busy    = false;
                quickPickTaskList.enabled = true;
              }
            } else {
              reject(`There is no tasklists in project ${project.label}`);
            }
          } else {
            quickPickTaskList.items = projectsList;
            // ⬆️ Fill projects and enable selection ⬇️
            quickPickTaskList.busy    = false;
            quickPickTaskList.enabled = true;
          }
        });
      }
    });
  }

  /**
   * Register provider to get userdata from Teamwork
   */
  private async register() {
    const token = await this.getToken();

    if (token) {
      const userData = await this.fetch(this.routes.auth, {
        method  : "GET",
        user    : token,
        password: this.password(token),
        useSSL  : true
      });
      if (!userData) {
        window.showWarningMessage(this.messages.warning.register, this.messages.actions.updateToken)
          .then(async (action) => {
            if (action == this.messages.actions.updateToken) {
              let token = await this.updateToken();
              if (token) this.register();
            }
          });
      }
      if (userData) {
        /**
         * Save Userdata
         */
        this.user = userData;
          this.user.username = token;
          this.user.password = this.password(token);
        this.url  = this.user.URL;
      }
    }
    return;
  }

  /**
   * Complete a task
   */
  async completeTask(id: Task['id']) {
    let endpoint = this.endpoints.complete;

    let response = this.fetch(endpoint.url.replace('{id}', id), {
      method: endpoint.method
    })
    .then(res => res)
    .catch(error => {
      window.showErrorMessage(error.MESSAGE);
      return null;
    });
  }

  /**
   * Generate Teamwork password
   * @param str usertoken
   * @returns reversed string
   */
  private password(str: string):string {
    return str.split("").reverse().join("");
  }

   /**
    * Convert task from Teamwork to PM Task
    * @param task Teamwork task object
    * @returns Task
    */
  private teamworkTask (task:any):Task {

    /**
     * Function to generate People object and save into task
     * @param isWho to return who parameter
     * @returns TaskData.people object with ID and name parameters with assigned people
     */
    const assignPeople = (isWho?:boolean) => {
      if (task["responsible-party-id"] && !isWho) {
        let countPeople = task["responsible-party-id"].split(',');
        if (Array.isArray(countPeople) && countPeople.length > 1) {
          // Multiple people assigned
          return countPeople.map((name, index) => {
            return {
              id  : task["responsible-party-id"].split(',')[index],
              fullName: task["responsible-party-names"].split('|')[index]
            }
          });
        } else {
          // only 1 person assigned
          return [{
            id  : task["responsible-party-id"],
            fullName: task["responsible-party-names"]
          }];
        }
      } else if ( task['responsible-party-summary'] ) {
        if (task["responsible-party-id"] === this.user.userId) {
          // Responsible and user are same
          return this.helpers.self;
        } else {
          // Summary
          return task['responsible-party-summary'];
        }
      } else {
        // No people assigned
        return this.helpers.unassigned;
      }
    }

    return new Task({
      id         : task["id"],
      provider   : this,
      title      : task["content"],
      date       : task["due-date"],
      who        : assignPeople(true),
      type       : task["priority"] == "high" ? 'urgent': 'normal',
      hasChildren: (task["subTasks"]) ? true : false,
      data       : {
        start        : task["start-date"],
        end          : task["due-date"],
        project      : {
          label: task["project-name"],
          id   : task["project-id"]
        },
        progress     : task["progress"],
        estimatedTime: task["estimated-minutes"],
        description  : task["description"],
        comments     : task["comments-count"],
        private      : task["private"],
        status       : task["status"],
        lastChanged  : task["last-changed-on"],
        people       : assignPeople(),
        subTasks     : (task['subTasks']) ? task['subTasks'].map( (task:any) => this.teamworkTask(task) ): undefined,
        creator      : {
          id       : task["creator-id"],
          firstName: task["creator-firstname"],
          lastName : task["creator-lastname"],
          avatar   : task["creator-avatar-url"]
        }
      }
    });
  }

}
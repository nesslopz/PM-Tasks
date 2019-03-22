const Providers = [
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
      getToken: "https://support.teamwork.com/projects/using-teamwork-projects/locating-your-api-key"
    }
  }
];

export default Providers;
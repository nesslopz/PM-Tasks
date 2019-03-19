'use strict';
import { window, workspace, ExtensionContext } from 'vscode';

import { TaskListProvider, Task } from './tasks/taskList';
import { tasksCommands } from "./tasks/tasksCommands";

// Activated
export function activate(context: ExtensionContext) {

  const pmSettings = workspace.getConfiguration('pm');
  let tasksProvider = window.registerTreeDataProvider('PMTaskList', new TaskListProvider(pmSettings));

  tasksCommands(context);
  context.subscriptions.push(tasksProvider);
}

// Deactivated
export function deactivate() {}

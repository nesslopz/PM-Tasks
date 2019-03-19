'use strict';
import { commands, window, workspace, ExtensionContext } from 'vscode';

import { TaskListProvider, Task } from './tasks/taskList';
// Activated
export function activate(context: ExtensionContext) {

  const pmSettings = workspace.getConfiguration('pm');
  let tasksProvider = window.registerTreeDataProvider('PMTaskList', new TaskListProvider(pmSettings));

  context.subscriptions.push(tasksProvider);
}

// Deactivated
export function deactivate() {}

'use strict';
import { window, workspace, ExtensionContext } from 'vscode';

import TasklistProvider from './tasks/tasklist';
import tasksCommands from "./tasks/commands";

// Activated
export function activate(context: ExtensionContext) {

  const pmSettings = workspace.getConfiguration('pm', null);
  let tasksProvider = window.registerTreeDataProvider('PMTaskList', new TasklistProvider(pmSettings));

  tasksCommands(context);
  context.subscriptions.push(tasksProvider);
}

// Deactivated
export function deactivate() {}

'use strict';
import { window, workspace, ExtensionContext } from 'vscode';

import TasklistProvider from './tasks/tasklist';
import tasksCommands from "./tasks/commands";

// Activated
export function activate(context: ExtensionContext) {

  const pmSettings = workspace.getConfiguration('pm', null);
  let tasksProvider = new TasklistProvider(pmSettings);

  let TreeDataProvider = window.registerTreeDataProvider('PMTaskList', tasksProvider);
  tasksCommands(context, tasksProvider);
  context.subscriptions.push(TreeDataProvider);
}

// Deactivated
export function deactivate() {}

import { ExtensionContext, commands, window } from 'vscode';

export function tasksCommands(context: ExtensionContext) {
  let configurePM = commands.registerCommand('PMTaskList.configure', () => {
    window.showErrorMessage('Config!');
  });
  /**
   *   // commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());

    // 	commands.registerCommand('nodeDependencies.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
    // commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
    // commands.registerCommand('nodeDependencies.deleteEntry', (node: Dependency) => window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
    */
  let addTask = commands.registerCommand('PMTaskList.create', () => {
    window.showInformationMessage('Create a Task!');
  });

  context.subscriptions.push(configurePM);
  context.subscriptions.push(addTask);
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

var filePath = "";

function pickFile() {
	vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		filters: {
			'JSON Files': ['json']
		}
	}).then(fileUri => {
		if (fileUri && fileUri[0]) {
			filePath = fileUri[0].fsPath;
			vscode.window.showInformationMessage(`Selected file: ${fileUri[0].fsPath.split('\\').pop()}`);
		}
	});
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Oshifier is ready to oshify your strings!');

	context.subscriptions.push(vscode.commands.registerCommand('oshifier.localize', () => {
		if (filePath == "") pickFile();

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);

			if (selectedText === "" || (!selectedText.startsWith("'") && !selectedText.startsWith('"')) || (!selectedText.endsWith("'") && !selectedText.endsWith('"'))) {
				vscode.window.showErrorMessage("Invalid selection. Please select a string enclosed in quotes.");
				return;
			}

			// String is valid, and the localization file has been selected
			fs.readFile(filePath, 'utf8', (err, data) => {
				if (err) {
					vscode.window.showErrorMessage(`Error reading file: ${err.message}`);
					return;
				}

				try {
					const jsonContent = JSON.parse(data);
					if (Array.isArray(jsonContent.messages)) {
						// The "messages" object array exists in the JSON file
						const placeholders: string[] = [];
						const newMessage = {
							id: crypto.randomUUID().toUpperCase(),
							translation: selectedText
								.slice(1, -1)
								.replace(/\$\{[^}]+\}|\$\S+/g, (match, p1, p2) => {
									var placeholder = match;

									if (placeholder.startsWith('${') && placeholder.endsWith('}')) placeholder = placeholder.slice(2, -1);
									else if (placeholder.startsWith('$')) placeholder = placeholder.slice(1);

									placeholders.push(placeholder);
									return "{}";
								})
						};

						// Check for duplicate id
						while (jsonContent.messages.some((message: any) => message.id === newMessage.id))
							newMessage.id = crypto.randomUUID().toUpperCase();

						const existingMessage = jsonContent.messages.find((message: any) => message.translation === newMessage.translation);
						if (existingMessage) {
							editor.edit(editBuilder => {
								editBuilder.replace(selection, placeholders.length === 0 ? `'${existingMessage.id}'.localized` : `'${existingMessage.id}'.localized.format(${placeholders.join(', ')})`);
							});
						} else {
							jsonContent.messages.push(newMessage);

							editor.edit(editBuilder => {
								editBuilder.replace(selection, placeholders.length === 0 ? `'${newMessage.id}'.localized` : `'${newMessage.id}'.localized.format(${placeholders.join(', ')})`);
							});

							fs.writeFile(filePath, JSON.stringify(jsonContent, null, 2), 'utf8', (err) => {
								if (err) {
									vscode.window.showErrorMessage(`Error saving file: ${err.message}`);
									return;
								}
								vscode.window.showInformationMessage(`File saved: ${filePath}`);
							});
						}

						fs.writeFile(filePath, JSON.stringify(jsonContent, null, 2), 'utf8', (err) => {
							if (err) {
								vscode.window.showErrorMessage(`Error saving file: ${err.message}`);
								return;
							}
							vscode.window.showInformationMessage(`File saved: ${filePath}`);
						});
					} else {
						vscode.window.showErrorMessage('The JSON file does not contain a "messages" object array.');
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Error parsing JSON file: ${error}`);
				}
			});


		} else {
			vscode.window.showErrorMessage("No active text editor found.");
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('oshifier.pickFile', () => pickFile()));
}

// This method is called when your extension is deactivated
export function deactivate() { }

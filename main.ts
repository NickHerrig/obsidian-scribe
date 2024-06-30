import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ScribeSettings {
	scribeSetting: string;
}

const DEFAULT_SETTINGS: ScribeSettings = {
	scribeSetting: 'default'
}

export default class ScribePlugin extends Plugin {
	settings: ScribeSettings;

	async onload() {
		console.log("loading plugin")
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Greet', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('New Message!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Scribe is enabled');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'rewrite-note',
			name: 'Rewrite Note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const noteContent = editor.getValue()
				console.log(noteContent)

				const template = `
				**Client Name:** <!-- Enter client name here -->

				---

				## Agenda
				<!-- General agenda for the meeting -->
				---
				## Meeting Notes
				<!-- General notes about the meeting -->

				**Participants:**
				-  My Team: 

				-  Client Team: 

				---
				## Next Steps 
				<!-- A bullet list of next steps and whose responsible for them -->


				---
				# References
				`

				const prompt = `
				Rewrite the note given the format of the template
				ensure that the note is formatted correctly and only contain template information:

				template:
				${template}

				note:
				${noteContent}
				`	

				console.log("reaching out to ollama")
				// Reach out the the LLM
				const response = await fetch('http://localhost:11434/api/generate', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: 'llama3',
						prompt: prompt, 
						stream: true
					})
				});


				if (!response.body) {
					console.error('Response body is null');
					return;
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder('utf-8');
				let result = ''; 

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = decoder.decode(value, { stream: true });
					try {
						const json = JSON.parse(chunk);
						if (json.response) {
							result += json.response;
							editor.setValue(result);
						}
					} catch (e) {
						console.error('Failed to parse JSON chunk', e);
					}
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ScribeSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log("unloading plugin")
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ScribeSettingTab extends PluginSettingTab {
	plugin: ScribePlugin;

	constructor(app: App, plugin: ScribePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.scribeSetting)
				.onChange(async (value) => {
					this.plugin.settings.scribeSetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

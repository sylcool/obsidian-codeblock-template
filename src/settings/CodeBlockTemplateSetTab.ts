import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { Key2List } from "src/model/ViewMesModel";

export interface CodeBlockTemplatePluginSettings {
	sourcePath: string;
	viewCodeBlockInfos: Key2List;
}

export const DEFAULT_SETTINGS: CodeBlockTemplatePluginSettings = {
	sourcePath: "templates",
	viewCodeBlockInfos: {},
};

export class CodeBlockTemplateSettingTab extends PluginSettingTab {
	plugin: CodeBlockTemplatePlugin;

	constructor(app: App, plugin: CodeBlockTemplatePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	async display() {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Template Source Path")
			.setDesc("Default Path /templates")
			.addText((cp) => {
				cp.setPlaceholder("Input Source Path")
					.setValue(
						this.plugin.settings.sourcePath
							? this.plugin.settings.sourcePath
							: ""
					)
					.onChange(async (text) => {
						if (text == "") {
							new Notice(
								"CodeBlockTemplate-Plugin：Source Path is undefined！This will cause the plugin not to work."
							);
							return;
						}
						this.plugin.settings.sourcePath = text;
						await this.plugin.saveSettings();
						await this.plugin.getSourceName2FilePath();
						this.plugin.renderAll();
					});
			});
	}
}

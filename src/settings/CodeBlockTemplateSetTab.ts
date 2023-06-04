import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { RE } from "src/utils/utils";

export interface CodeBlockTemplatePluginSettings {
	sourcePath: string;
	sourceNameList: string[];
	sourceName2FilePath: { [key: string]: string };
	anonymousVariableNamePrefix: string;
}

export const DEFAULT_SETTINGS: CodeBlockTemplatePluginSettings = {
	sourcePath: "templates",
	sourceNameList: [],
	sourceName2FilePath: {},
	anonymousVariableNamePrefix: "anonymous_var_",
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
			.setName("Template source path")
			.setDesc("Default Path /templates")
			.addText((cp) => {
				cp.setPlaceholder("Input Source Path")
					.setValue(this.plugin.settings.sourcePath)
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

		new Setting(containerEl)
			.setName("Anonymous variable name prefix")
			.setDesc(
				"Default prefix is 'anonymous_var_'. The prefix should conform to the identifier definition rule"
			)
			.addText((cp) => {
				cp.setPlaceholder("Input prefix")
					.setValue(this.plugin.settings.anonymousVariableNamePrefix)
					.onChange(async (text) => {
						if (!RE.variableSynatx.test(text)) {
							new Notice(
								"CodeBlockTemplate-Plugin：Prefix is invalid！The prefix should conform to the identifier definition rule."
							);
							this.plugin.settings.anonymousVariableNamePrefix =
								"anonymous_var_";
						} else
							this.plugin.settings.anonymousVariableNamePrefix =
								text;
						await this.plugin.saveSettings();
						this.plugin.renderAll();
					});
			});
	}
}

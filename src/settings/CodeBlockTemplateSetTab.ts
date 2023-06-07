import type { App } from 'obsidian'
import { Notice, PluginSettingTab, Setting } from 'obsidian'
import type CodeBlockTemplatePlugin from 'src/main'
import { RE } from 'src/utils/utils'

export interface CodeBlockTemplatePluginSettings {
  sourcePath: string
  oldValidSourcePath: string
  sourceNameList: string[]
  sourceName2FilePath: { [key: string]: string }
  anonymousVariableNamePrefix: string
}

export const DEFAULT_SETTINGS: CodeBlockTemplatePluginSettings = {
  sourcePath: 'templates',
  oldValidSourcePath: 'templates',
  sourceNameList: [],
  sourceName2FilePath: {},
  anonymousVariableNamePrefix: 'anonymous_var_',
}

export class CodeBlockTemplateSettingTab extends PluginSettingTab {
  plugin: CodeBlockTemplatePlugin

  constructor(app: App, plugin: CodeBlockTemplatePlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  async display() {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName('Template source path')
      .setDesc('Default Path /templates. If the input path is invalid, the last valid path will be used automatically.')
      .addText((cp) => {
        cp.setPlaceholder('Input Source Path')
          .setValue(this.plugin.settings.sourcePath)
          .onChange(async (text) => {
            if (text == '') {
              new Notice('CodeBlockTemplate-Plugin：Source Path is null！This will cause the plugin not to work.')
              this.plugin.settings.sourcePath = 'templates'
            }else{
              this.plugin.settings.sourcePath = text
            }
            await this.plugin.saveSettings()
            this.plugin.renderAll()
          })
      })

    new Setting(containerEl)
      .setName('Anonymous variable name prefix')
      .setDesc(
        'Default prefix is \'anonymous_var_\'. The prefix should conform to the identifier definition rule',
      )
      .addText((cp) => {
        cp.setPlaceholder('Input prefix')
          .setValue(this.plugin.settings.anonymousVariableNamePrefix)
          .onChange(async (text) => {
            if (!RE.variableSynatx.test(text)) {
              new Notice('CodeBlockTemplate-Plugin：Prefix is invalid！The prefix should conform to the identifier definition rule.')
              this.plugin.settings.anonymousVariableNamePrefix = 'anonymous_var_'
            }
            else {
              this.plugin.settings.anonymousVariableNamePrefix = text
            }
            await this.plugin.saveSettings()
            this.plugin.renderAll(false)
          })
      })
  }
}

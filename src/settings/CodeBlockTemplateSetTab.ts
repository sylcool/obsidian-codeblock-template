import type { App } from 'obsidian'
import { Notice, PluginSettingTab, Setting } from 'obsidian'
import SettingsProxy from 'src/proxy/SettingsProxy'
import type CodeBlockTemplatePlugin from 'src/main'
import { RE } from 'src/utils/ObsidianUtils'
import {SuggestionRender} from 'src/render/SuggestionRender'
import { TemplateLayoutRender } from 'src/render/TemplateLayoutRender'

export class CodeBlockTemplateSettingTab extends PluginSettingTab {
  plugin: CodeBlockTemplatePlugin
  settingProxy: SettingsProxy
  suggestionRender: SuggestionRender
  templateRender: TemplateLayoutRender

  constructor(app: App, plugin: CodeBlockTemplatePlugin) {
    super(app, plugin)
    this.plugin = plugin
    this.settingProxy = SettingsProxy.getSettingsProxy(plugin)
    this.suggestionRender = SuggestionRender.getSuggestionRender(plugin)
    this.templateRender = TemplateLayoutRender.getTemplateLayoutRender(plugin)
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
              // this.plugin.settings.sourcePath = 'templates'
              text = 'templates'
            }
            this.settingProxy.updateSettings('sourcePath', text, () => {
              this.suggestionRender.refreshAllSourceVariable()
              this.templateRender.getSourceName2FilePath()
            })
            await this.plugin.saveSettings()
            
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
              // this.plugin.settings.anonymousVariableNamePrefix = 'anonymous_var_'
              text = "anonymous_var_"
            }
            this.settingProxy.updateSettings('anonymousVariableNamePrefix', text, ()=>{
              this.suggestionRender.refreshAllSourceVariable()
            })
            await this.plugin.saveSettings()
            this.templateRender.renderAll()
          })
      })
  }
}

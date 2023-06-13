import { Plugin } from 'obsidian'
import { CodeBlockTemplateSettingTab } from './settings/CodeBlockTemplateSetTab'
import { SourceManager } from './manager/SourceManager'
import { ViewManager } from "./manager/ViewMananger";
import { SuggestionRender }  from './render/SuggestionRender'
import { CodeBlockTemplatePluginSettings, DEFAULT_SETTINGS } from "./model/SettingsModel";
import { ViewSuggestion } from './components/EditorSuggesttion'
import { TemplateLayoutRender } from './render/TemplateLayoutRender';

export default class CodeBlockTemplatePlugin extends Plugin {
  settings: CodeBlockTemplatePluginSettings
  
  isInit = false;

  templateRender: TemplateLayoutRender
  suggestionRender: SuggestionRender
  sourceManager: SourceManager
  viewManager: ViewManager

  async onload() {
    await this.loadSettings()

    this.templateRender = TemplateLayoutRender.getTemplateLayoutRender(this)
    this.suggestionRender = SuggestionRender.getSuggestionRender(this)
    this.sourceManager = SourceManager.getSourceManager(this)
    this.viewManager = ViewManager.getViewManager()

    this.addSettingTab(new CodeBlockTemplateSettingTab(this.app, this))

    this.registerEditorSuggest(new ViewSuggestion(this))

    this.app.workspace.onLayoutReady(async () => {
      if (this.settings.sourceNameList.length === 0)
        await this.templateRender.getSourceName2FilePath()
      const viewNames = this.viewManager.getAllNames()
      for (const name of viewNames){
        this.templateRender.render4Name(name)
      }
      this.isInit = true;

      this.suggestionRender.refreshAllSourceVariable();
    })

    this.registerMarkdownCodeBlockProcessor(
      'pack-view',
      (source, el, ctx) => {
        // __________________获取viewName__________________
        const viewName = this.sourceManager.getCodeBlockIdentifier(ctx,el)
        if (viewName === undefined) return;

        // __________________将TemplContent渲染到页面__________________
          // 每个view都加上class和no属性

        // 通过文件和行号创建唯一的viewID
        const viewId = this.viewManager.createID(this.app.workspace.getActiveFile(), ctx.getSectionInfo(el)?.lineStart.toString() ?? "error")
        
        el.addClass(viewName, `pack-view-${viewName}-${viewId}`);

        // 会在第二个view加载时，el还没被渲染，第一个view所以会因为无法获取el而被删除。通过添加isInit判断，可以避免这个问题
        if(this.isInit && !this.viewManager.getIDList4Name(viewName).contains(viewId)) this.viewManager.deleteInvalidId(viewName);
        
        this.viewManager.updateView(viewName, viewId, {
          input: source,
          viewPath: ctx.sourcePath,
        })
        

        if(this.isInit) this.templateRender.render4ID(viewName, viewId, source, ctx.sourcePath);
      },
    )

    this.registerMarkdownCodeBlockProcessor(
      'pack-source',
      async (source, el, ctx) => {
        el.createEl('pre').createEl('code', { text: source })
        await this.templateRender.getSourceName2FilePath()
        const sourceName = this.sourceManager.getCodeBlockIdentifier(ctx,el)
        if (sourceName === undefined) return;
        this.templateRender.render4Name(sourceName)
      },
    )

    this.app.workspace.on("editor-change",(editor, info)=>{
      const cursor = editor.getCursor();
      if(RegExp("^([\\.]{3,})$").test(editor.getLine(cursor.line))){
        
      }
    })

  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData(),
    )
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

}

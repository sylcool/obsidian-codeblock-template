import type { TFile } from 'obsidian'
import { MarkdownRenderer, Plugin } from 'obsidian'
import { CodeBlockProcessor, FileOpt, RE, ViewManager } from './utils/utils'
import type { CodeBlockTemplatePluginSettings } from './settings/CodeBlockTemplateSetTab'
import {
  CodeBlockTemplateSettingTab,
  DEFAULT_SETTINGS,
} from './settings/CodeBlockTemplateSetTab'

export default class CodeBlockTemplatePlugin extends Plugin {
  settings: CodeBlockTemplatePluginSettings
  codeblockProcessor: CodeBlockProcessor
  viewManager: ViewManager

  isInit = false;

  async onload() {
    await this.loadSettings()

    this.viewManager = ViewManager.getViewManager()
    this.codeblockProcessor = CodeBlockProcessor.getCodeBlockProcessor(this)

    this.addSettingTab(new CodeBlockTemplateSettingTab(this.app, this))


    this.app.workspace.onLayoutReady(async () => {
      this.isInit = true;
      if (this.settings.sourceNameList.length === 0)
        await this.getSourceName2FilePath()
      const viewNames = this.viewManager.getAllNames()
      for (const name of viewNames){
        this.render4Name(name)
      }
    })

    this.registerMarkdownCodeBlockProcessor(
      'pack-view',
      (source, el, ctx) => {
        // __________________获取viewName__________________
        const viewName = this.codeblockProcessor.getCodeBlockIdentifier(ctx,el)
        if (viewName === undefined) return;

        // __________________将TemplContent渲染到页面__________________
          // 每个view都加上class和no属性

        const viewID = ctx.getSectionInfo(el)?.lineStart.toString() ?? "A";

        
        el.addClass(viewName, `pack-view-${viewName}-${viewID}`);

        // 会在第二个view加载时，el还没被渲染，第一个view所以会因为无法获取el而被删除。通过添加isInit判断，可以避免这个问题
        if(this.isInit && !this.viewManager.getIDList4Name(viewName).contains(viewID)) this.viewManager.deleteInvalidId(viewName);
        
        this.viewManager.updateView(viewName, viewID, {
          input: source,
          viewPath: ctx.sourcePath,
        })
        

        if(this.isInit) this.render4ID(viewName, viewID, source, ctx.sourcePath);
      },
    )

    this.registerMarkdownCodeBlockProcessor(
      'pack-source',
      async (source, el, ctx) => {
        el.createEl('pre').createEl('code', { text: source })
        await this.getSourceName2FilePath()
        const sourceName = this.codeblockProcessor.getCodeBlockIdentifier(ctx,el)
        if (sourceName === undefined) return;
        this.render4Name(sourceName)
      },
    )

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

  async getSourceName2FilePath() {
    /**
		 * 功能：
		 * 1. 获取模板名称到文件路径的对应关系，方便查找模板文件，避免每次查找都遍历Source Path下的所有文件
		 * 2. 获取最新的模板列表，判断使用的模板是否已经定义
		 *
		 * 更新sourceName2FilePath、sourceNameList
		 */

    const fopt = new FileOpt(this.app)

    let isUpdated = false;

    const tfiles: TFile[]
			= await fopt.getMarkdownFilesFromFolderRecursively(
          this.settings.sourcePath,
			)

    for (const tfile of tfiles) {
      const content = await this.app.vault.cachedRead(tfile)

      const allCodeblockName = content.match(RE.reCodeBlockName4Source)
      if (allCodeblockName == null)
        return

      if(!isUpdated) {
        this.settings.oldValidSourcePath = this.settings.sourcePath;

        this.settings.sourceName2FilePath = {}
        this.settings.sourceNameList = []

        console.log("Codeblock Template：Source path is updated！sourceName2FilePath and sourceNameList are updated")

        isUpdated = true;
      }
      for (const cbname of allCodeblockName) {
        this.settings.sourceName2FilePath[cbname] = tfile.path
        this.settings.sourceNameList.push(cbname)
      }
    }
    if(!isUpdated) {
      this.settings.sourcePath = this.settings.oldValidSourcePath;
    }
    this.saveSettings()
  }

  render(cls: string, template:string|undefined, viewPath:string) {
    const els = document.getElementsByClassName(cls);
    for (let index = 0; index < els.length; index++) {
      const el = els[index] as HTMLElement
      if (el == null) return;
      el.empty()
      if (template !== undefined) {
        MarkdownRenderer.renderMarkdown(template,el,viewPath,this);
      }else{
        MarkdownRenderer.renderMarkdown('Codeblock Template：Template is not defined!',el,viewPath,this);
      }
      
    }
  }

  async render4Name(name: string, isEmpty = false) {
    const vkeys = Object.keys(this.viewManager.getViews4Name(name));
    const allViews = this.viewManager.getViews4Name(name)

    for (const key of vkeys) {
      const cls = this.viewManager.getClassNameList4Name(name, key)
      const view = allViews[key];
      let templContent;
      if(!isEmpty) templContent = await this.codeblockProcessor.getTemplContent(name,view.input)
      this.render(cls, templContent, view.viewPath)
    }
  }

  async render4ID(
    viewName: string,
    elID: string,
    input: string,
    path: string,
  ) {
    const templContent = await this.codeblockProcessor.getTemplContent(viewName,input)
    this.render(`pack-view-${viewName}-${elID}`, templContent, path)
  }

  async renderAll(reflexUpdate = true) {
    if (reflexUpdate) // 不需要更新SourceNameList
      await this.getSourceName2FilePath()
    const sourceNameList = this.settings.sourceNameList;
    const invalidViews = this.viewManager.getAllNames().filter(viewName => !sourceNameList.contains(viewName));

    for (const name of sourceNameList){
      this.render4Name(name)
    }

    for(const name of invalidViews){
      this.render4Name(name, true)
    }
  }
}

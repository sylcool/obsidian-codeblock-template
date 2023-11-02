import {MarkdownPreviewRenderer, MarkdownRenderer, TFile} from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { FileOpt, RE } from "src/utils/ObsidianUtils";
import { ViewManager } from "src/manager/ViewMananger";
import { SourceManager } from "src/manager/SourceManager";
import {CodeBlockPostViewInfo} from "../model/ViewMesModel";

export class TemplateLayoutRender{
  private static _instance : TemplateLayoutRender;
  private _plugin: CodeBlockTemplatePlugin
  private _fileOpt: FileOpt
  private _viewManager: ViewManager
  private _sourceManager: SourceManager

  private constructor(plugin: CodeBlockTemplatePlugin){
    this._plugin = plugin;
    this._fileOpt = new FileOpt(plugin.app)
    this._viewManager = ViewManager.getViewManager()
    this._sourceManager = SourceManager.getSourceManager(plugin)
  }

  public static getTemplateLayoutRender(_plugin: CodeBlockTemplatePlugin){
    if(!this._instance) this._instance = new TemplateLayoutRender(_plugin)

    return this._instance;
  }

  async getSourceName2FilePath() {
    /**
		 * 功能：
		 * 1. 获取模板名称到文件路径的对应关系，方便查找模板文件，避免每次查找都遍历Source Path下的所有文件
		 * 2. 获取最新的模板列表，判断使用的模板是否已经定义
		 *
		 * 更新sourceName2FilePath、sourceNameList
		 */

    let isUpdated = false;

    const tfiles: TFile[]
			= await this._fileOpt.getMarkdownFilesFromFolderRecursively(
          this._plugin.settings.sourcePath,
			)

    for (const tfile of tfiles) {
      const content = await this._plugin.app.vault.cachedRead(tfile)

      const allCodeblockName = content.match(RE.reCodeBlockName4Source)
      if (allCodeblockName == null)
        return

      if(!isUpdated) {
        this._plugin.settings.oldValidSourcePath = this._plugin.settings.sourcePath;

        this._plugin.settings.sourceName2FilePath = {}
        this._plugin.settings.sourceNameList = []

        console.log("Codeblock Template：Source is updated！sourceName2FilePath and sourceNameList are updated")

        isUpdated = true;
      }
      for (const cbname of allCodeblockName) {
        this._plugin.settings.sourceName2FilePath[cbname] = tfile.path
        this._plugin.settings.sourceNameList.push(cbname)
      }
    }
    if(!isUpdated) {
      this._plugin.settings.sourcePath = this._plugin.settings.oldValidSourcePath;
      this.renderAll();
    }
    this._plugin.saveSettings()
  }

  render(cls: string, template:string|undefined, viewPath:string) {
    const els = document.getElementsByClassName(cls);
    for (let index = 0; index < els.length; index++) {
      const el = els[index] as HTMLElement
      if (el == null) return;
      el.empty()
      if (template !== undefined) {
        MarkdownRenderer.renderMarkdown(template,el,viewPath,this._plugin);
      }else{
        MarkdownRenderer.renderMarkdown('Codeblock Template：Template is not defined!',el,viewPath,this._plugin);
      }
      
    }
  }

  async render4Name(name: string, isEmpty = false) {
    const vkeys = Object.keys(this._viewManager.getViews4Name(name));
    const allViews = this._viewManager.getViews4Name(name)

    for (const key of vkeys) {
      const cls = this._viewManager.getClassNameList4Name(name, key)
      const view = allViews[key];
      let templContent;
      if(!isEmpty) templContent = await this._sourceManager.getTemplContent(view)
      this.render(cls, templContent, view.viewPath)
    }
  }

  async render4ID(
	view: CodeBlockPostViewInfo
  ) {
    const templContent = await this._sourceManager.getTemplContent(view)
    this.render(`pack-view-${view.name}-${view.id}`, templContent, view.viewPath)
  }

  async renderAll() {
    const sourceNameList = this._plugin.settings.sourceNameList;
    const invalidViews = this._viewManager.getAllNames().filter(viewName => !sourceNameList.contains(viewName));

    for (const name of sourceNameList){
      this.render4Name(name)
    }

    for(const name of invalidViews){
      this.render4Name(name, true)
    }
  }
}

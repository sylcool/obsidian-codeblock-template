import { MarkdownPostProcessorContext } from "obsidian"
import CodeBlockTemplatePlugin from "src/main"
import { UserValueData } from "src/model/ReflexModel"
import { RE, StrOpt, V2SConverter } from "src/utils/ObsidianUtils"
import {CodeBlockPostViewInfo} from "../model/ViewMesModel";
import {ViewToContentConverter} from "../converter/ViewToContentConverter";
import {DefaultTextConverter} from "../converter/DefaultTextConverter";
import {CsvConverter} from "../converter/CsvConverter";

export class SourceManager {
  private static _instance: SourceManager
  
  private _plugin: CodeBlockTemplatePlugin

  private converters: ViewToContentConverter[] = [];

  private constructor(plugin: CodeBlockTemplatePlugin) {
    this._plugin = plugin;
	this.converters = [
		new DefaultTextConverter(this._plugin),
		new CsvConverter(this._plugin),
	]
  }

  static getSourceManager(plugin: CodeBlockTemplatePlugin) {
    if (SourceManager._instance === undefined) {
      SourceManager._instance = new SourceManager(plugin)
    }
    return SourceManager._instance
  }


  async getTemplContent(view: CodeBlockPostViewInfo) {
	const converter: ViewToContentConverter = this.getConverter(view);
	return converter.convert(view);
  }

	private getConverter(view: CodeBlockPostViewInfo): ViewToContentConverter {
		 return  this.converters.find(converter => converter.supportViewInputType() === view.inputType)??this.converters[0];
	}

  getCodeBlockIdentifier4View(ctx: MarkdownPostProcessorContext, el: HTMLElement) {
    const cbInfo = ctx.getSectionInfo(el)
    const viewName = cbInfo?.text
    .split('\n')[cbInfo.lineStart].match(RE.reCsvCodeBlockName4View)?.[0]
	  if (viewName) {
		  return viewName;
	  }
	  return cbInfo?.text
		  .split('\n')[cbInfo.lineStart].match(RE.reCodeBlockName4View)?.[0]
  }

  getCodeBlockIdentifier4Source(ctx: MarkdownPostProcessorContext, el: HTMLElement) {
    const cbInfo = ctx.getSectionInfo(el)
    const sourceName = cbInfo?.text
    .split('\n')[cbInfo.lineStart].match(RE.reCodeBlockName4Source)?.[0]
    return sourceName
  }
}

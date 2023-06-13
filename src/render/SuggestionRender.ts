import {FileOpt, RE } from "../utils/ObsidianUtils";
import CodeBlockTemplatePlugin from "src/main";

export class SuggestionRender {
  private static _instance: SuggestionRender;
  private _fileOpt: FileOpt;
  private _plugin: CodeBlockTemplatePlugin;

  public static isVariableRefresh = false;


  private constructor(plugin: CodeBlockTemplatePlugin) {
    this._fileOpt = new FileOpt(plugin.app)
    this._plugin = plugin;
  }

  static getSuggestionRender(plugin: CodeBlockTemplatePlugin): SuggestionRender {
    if (!SuggestionRender._instance) {
      SuggestionRender._instance = new SuggestionRender(plugin);
    }
    return SuggestionRender._instance;
  }

  async refreshAllSourceVariable(){ // 重新加载Source 模板中的变量
    const files = await this._fileOpt.getMarkdownFilesFromFolderRecursively(this._plugin.settings.sourcePath);
    this._plugin.settings.sourceInfos = {} // 重新初始化
    for(const file of files){
      (await this._fileOpt.getAllCodeBlocks(file)).forEach((codeblock) => {
        const sourceName = codeblock.match(RE.reCodeBlockName4Source)?.[0] ?? '';
        const variableList = codeblock.match(RE.reVariableName) ?? [];
        this._plugin.settings.sourceInfos[sourceName] = variableList;
        this._plugin.saveSettings()
      });
    }
    SuggestionRender.isVariableRefresh = true;
  }
}
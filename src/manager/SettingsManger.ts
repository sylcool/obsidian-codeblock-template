import { EditorPosition } from "obsidian";
import CodeBlockTemplatePlugin from "src/main"
import { RE } from "src/utils/ObsidianUtils";

export class SettingsManager{
  private static _instance: SettingsManager
  private _plugin: CodeBlockTemplatePlugin

  private constructor(plugin: CodeBlockTemplatePlugin) { 
    this._plugin = plugin;
  }

  public static getInstance(plugin: CodeBlockTemplatePlugin): SettingsManager {
    if(!SettingsManager._instance){
      SettingsManager._instance = new SettingsManager(plugin);
    }
    return SettingsManager._instance;
  }

  getSuggestion4All(){
    return Object.keys(this._plugin.settings.sourceInfos)
  }

  getSuggestion4Input(input: string){
    let name = '';
    if(input.indexOf("...") !== -1){
      name = input.replace("...", "").trim();
    }else{
      name = input.match(RE.reCodeBlockName4View)?.[0] ?? '';
    }
    return Object.keys(this._plugin.settings.sourceInfos).filter((value) => value.indexOf(name) !== -1)
  }

  getViewTemplate(viewName:string, line: number){
    let template = "```pack-view " + viewName + "\n";
    let coursor:EditorPosition|undefined;
    const variableList = this._plugin.settings.sourceInfos[viewName]
    for(const variable of variableList){
      if(coursor === undefined){
        coursor = {line: line+1, ch: variable.length+3}
      }
      template += variable + " = \n"
    }
    template += "```"
    return {template, coursor};
  }
}
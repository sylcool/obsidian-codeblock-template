import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { SettingsManager } from "src/manager/SettingsManger";


export class ViewSuggestion extends EditorSuggest<string> {
  private _plugin: CodeBlockTemplatePlugin;
  private _settingsManager: SettingsManager

  constructor(plugin: CodeBlockTemplatePlugin) {
    super(plugin.app)
    this._plugin = plugin;
    this._settingsManager = SettingsManager.getInstance(plugin)
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    // throw new Error("Method not implemented.");
    console.log("onTrigger",editor.getLine(cursor.line))
    if(editor.getLine(cursor.line).match(/.*pack-view[ ]{1}.*/) || editor.getLine(cursor.line).match(/\.{3}/)){
      return {
        end: cursor,
        start: cursor,
        query: editor.getLine(cursor.line)
      }
    }else{
      return null;
    }
  }
  getSuggestions(context: EditorSuggestContext): string[] | Promise<string[]> {
    // throw new Error("Method not implemented.");
    // 返回值用于渲染提示列表
    console.log("getSuggestion")

    return this._settingsManager.getSuggestion4All();
  }
  renderSuggestion(value: string, el: HTMLElement): void {
    // throw new Error("Method not implemented.");
    console.log("renderSuggestion:", value)
    const container = el.createDiv({text: value})
    container.addClass("pack-view-suggestion-container")
  }
  
  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    // throw new Error("Method not implemented.");
    // eslint-disable-next-line prefer-const
    let {template, coursor} = this._settingsManager.getViewTemplate(value, this.context?.start.line ?? 0);
    if(this.context?.editor.getLine(this.context?.start.line).match(/`*pack-view .*/)){
      template = template.slice(0, template.lastIndexOf("\n"))
    }
    this.context?.editor.setLine(this.context.end.line, template)
    if(coursor !== undefined){
      this.context?.editor.setCursor(coursor??{line: 0, ch: 0})
    }
  }

}
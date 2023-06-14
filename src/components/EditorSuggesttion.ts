import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { SettingsManager } from "src/manager/SettingsManger";


export class ViewSuggestion extends EditorSuggest<string> {
  private _plugin: CodeBlockTemplatePlugin;
  private _settingsManager: SettingsManager

  private _isAll = true;

  constructor(plugin: CodeBlockTemplatePlugin) {
    super(plugin.app)
    this._plugin = plugin;
    this._settingsManager = SettingsManager.getInstance(plugin)
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    if(editor.getLine(cursor.line).match(/^`*pack-view .*$/gm) || editor.getLine(cursor.line).match(/^(\.\.\.)/gm)){
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
    // 返回值用于渲染提示列表
    if(context.editor.getLine(context.start.line).trim() === "..."){
      this._isAll = true;
      return this._settingsManager.getSuggestion4All();
    }else{
      this._isAll = false;
      return this._settingsManager.getSuggestion4Input(context.query.trim())
    }
  }
  renderSuggestion(value: string, el: HTMLElement): void {
    const container = el.createDiv({text: value})
    container.addClass("pack-view-suggestion-container")

  }
  
  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    // eslint-disable-next-line prefer-const
    let {template, coursor} = this._settingsManager.getViewTemplate(value, this.context?.start.line ?? 0);
    if(!this._isAll){
      template = template.slice(0, template.lastIndexOf("\n"))
    }
    this.context?.editor.setLine(this.context.end.line, template)
    if(coursor !== undefined){
      this.context?.editor.setCursor(coursor??{line: 0, ch: 0})
    }
  }

}
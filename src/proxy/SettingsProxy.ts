import CodeBlockTemplatePlugin from "src/main";


export default class SettingsProxy{
  private static _instance: SettingsProxy
  private _plugin: CodeBlockTemplatePlugin
  private constructor(_plugin: CodeBlockTemplatePlugin) { 
    this._plugin = _plugin;
  }

  static getSettingsProxy(_plugin: CodeBlockTemplatePlugin): SettingsProxy {

    if(!SettingsProxy._instance){
      SettingsProxy._instance = new SettingsProxy(_plugin);
    }
    return SettingsProxy._instance;
  }
  updateSettings(key: string, value:any, callback= () => {}){
    if(this._plugin.settings[key]){
      this._plugin.settings[key] = value
      callback()
    }else{
      throw new Error('SettingsProxy: updateSettings: key is invalid')
    }
  }
}
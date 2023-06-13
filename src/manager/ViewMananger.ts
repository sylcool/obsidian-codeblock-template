import { TFile } from "obsidian";
import { CodeBlockPostViewInfo, ViewName2CodeBlockPostViewInfos } from "src/model/ViewMesModel";
import { Md5 } from "ts-md5";

export class ViewManager {
  private name2View: ViewName2CodeBlockPostViewInfos;
  private static instance: ViewManager;

  private constructor() {
    this.name2View = {}
  }

  static getViewManager() {
    if (ViewManager.instance == undefined){
      ViewManager.instance = new ViewManager()
    }

    return ViewManager.instance
  }

  updateView(viewName: string, id: string, info: CodeBlockPostViewInfo) {
    if (this.name2View[viewName] == undefined)
      this.name2View[viewName] = {}
    this.name2View[viewName][id] = info

  }

  getClassNameList4Name(viewName: string, elID: string) {
    return `pack-view-${viewName}-${elID}`
  }

  getView4ID(viewName: string, id: string) {
    return this.name2View[viewName][id]
  }

  getViews4Name(viewName: string) {
    return this.name2View[viewName] ?? {}
  }

  getAllNames() {
    return Object.keys(this.name2View)
  }

  getIDList4Name(viewName: string) {
    // 第一次还未初始化
    return Object.keys(this.name2View[viewName] ?? {}) 
  }

  createID(tfile: TFile|null, line:string){
    const text = tfile?.path + line + tfile?.name;
    const completionMD5 = new Md5().appendStr(text).end() as string;
    return completionMD5.slice(0, 8)
  }

  deleteInvalidId(viewName:string){
    const ids = this.getIDList4Name(viewName)
    for(const id of ids){
      const el = document.getElementsByClassName("pack-view-"+viewName+"-"+ id)[0];
      if(el === undefined){
        delete this.name2View[viewName][id]
        console.log("delete invalid id: "+id, this.name2View[viewName])
      }
    }
  }
}

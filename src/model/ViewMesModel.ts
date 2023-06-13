export interface CodeBlockPostViewInfo {
  input: string
  viewPath: string
}

export interface ViewName2CodeBlockPostViewInfos {
  [viewName: string]: { 
    [id: string]: CodeBlockPostViewInfo 
  }
}

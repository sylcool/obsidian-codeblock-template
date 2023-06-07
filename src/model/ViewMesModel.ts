export interface CodeBlockPostViewInfo {
  input: string
  viewPath: string
}

export interface Key2List {
  [viewName: string]: { 
    [id: string]: CodeBlockPostViewInfo 
  }
}

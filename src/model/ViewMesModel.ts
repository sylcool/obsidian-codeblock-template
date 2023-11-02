export interface CodeBlockPostViewInfo {
	id: string
	name: string
  input: string
  inputType: string
  viewPath: string
}

export interface ViewName2CodeBlockPostViewInfos {
  [viewName: string]: { 
    [id: string]: CodeBlockPostViewInfo 
  }
}

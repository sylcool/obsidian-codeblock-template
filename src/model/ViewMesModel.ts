interface CodeBlockPostViewInfo {
	source: string;
	path: string;
}

export interface Key2List {
	[viewName: string]: CodeBlockPostViewInfo;
}

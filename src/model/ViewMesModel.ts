interface CodeBlockPostViewInfo {
	source: string;
	elID: string;
	path: string;
}

export interface Key2List {
	[viewName: string]: CodeBlockPostViewInfo;
}

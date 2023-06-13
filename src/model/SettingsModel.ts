interface Settings{
  [key: string]: any
}

export interface CodeBlockTemplatePluginSettings extends Settings {
  sourcePath: string
  oldValidSourcePath: string
  sourceNameList: string[]
  sourceName2FilePath: { [key: string]: string }
  anonymousVariableNamePrefix: string
  sourceInfos: {[sourceName: string]: string[]}
}

export const DEFAULT_SETTINGS: CodeBlockTemplatePluginSettings = {
  sourcePath: 'templates',
  oldValidSourcePath: 'templates',
  sourceNameList: [],
  sourceName2FilePath: {},
  anonymousVariableNamePrefix: 'anonymous_var_',
  sourceInfos: {},
}
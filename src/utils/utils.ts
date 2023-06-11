import type {
  App,
  MarkdownPostProcessorContext,
} from 'obsidian'
import {
  Notice,
  TFile,
  TFolder,
  Vault,
} from 'obsidian'
import type CodeBlockTemplatePlugin from 'src/main'
import type { Name2Path, UserValueData } from 'src/model/ReflexModel'
import type { CodeBlockPostViewInfo, Key2List } from 'src/model/ViewMesModel'
import {Md5} from 'ts-md5';

export class V2SConverter {
  private app: App
  private codeName2Path: Name2Path
  private static instance: V2SConverter

  private constructor(app: App, codeName2Path: Name2Path) {
    this.app = app
    this.codeName2Path = codeName2Path
  }

  static getV2SConverter(app: App, codeName2Path: Name2Path) {
    if (V2SConverter.instance == undefined)
      V2SConverter.instance = new V2SConverter(app, codeName2Path)
    else
      V2SConverter.instance.codeName2Path = codeName2Path

    return V2SConverter.instance
  }

  async getSourceContentOfCBName(viewName: string) {
    // ___________________定位到文件，并读取内容___________________
    const filePath = this.codeName2Path[viewName]
    if (filePath == undefined) {
      new Notice(`The ${viewName} template has not been defined. `)
      return undefined
    }

    const file = this.app.vault.getAbstractFileByPath(filePath) as TFile

    const content = await this.app.vault.cachedRead(file)

    // ___________________提取对应viewName的CodeBlock内容___________________
    // 通过前缀匹配CodeBlock
    const cbPrefix = content.match(RE.getReCodeBlockPrefix(viewName))?.[0]
    if (cbPrefix == null)
      return undefined

    const completeCodeBlock = content.match(
      RE.getRecompleteCodeBlock(cbPrefix),
    )?.[0]
    if (completeCodeBlock == undefined) {
      new Notice('Pack-Source prefix formation invalid！')
      return undefined
    }

    const contentOfCodeBlock
			= StrOpt.getCodeBlockContent(completeCodeBlock)

    if (contentOfCodeBlock == undefined) {
      new Notice('Pack-Source content formation invalid！')
      return undefined
    }
    return contentOfCodeBlock
  }

  async insertVariable(content: string, keys: string[], values: UserValueData) {
    if (keys.length == 0) {
      console.log('No variables are used!')
      return content
    }

    const needReplaceList = Array.from(
      new Set(content.match(RE.reNeedReplaceStr)),
    )
    if (needReplaceList == null) {
      new Notice('Replace invalid！More info in console.')
      console.log(
        'The passed-in variable name does not match the variable name in the template',
      )
      return content
    }

    let contentTempl = content
    for (const nrStr of needReplaceList) {
      const varName = nrStr.match(RE.reVariableName)?.[0]
      if (varName == null) {
        new Notice('Replace invalid！More info in console.')
        console.log('Replace invalid：Source variable name invalid！Please check whether the variable name is valid.')
        continue
      }

      if (keys.includes(varName)) {
        if(values[varName].startsWith('[') && values[varName].endsWith(']')) {
          console.log(contentTempl)
          const aline = contentTempl.match(new RegExp(`.*?\\$\\.\\{${varName}\\}.*[\n]?`))?.[0] ?? "";
          console.log(aline)
          let loopContent = ""
          const list = values[varName].slice(1, values[varName].length - 1).split(',');
          for(const value of list) {
            loopContent += aline?.replaceAll(nrStr, value) + "\n"
          }
          contentTempl = contentTempl.replaceAll(aline, loopContent)
        }else{
          contentTempl = contentTempl.replaceAll(nrStr, values[varName])
        }
      }
      else {
        new Notice('Replace invalid！More info in console.')
        console.log(
          'Replace invalid：The input variable and the variable to be replaced have different names.',
        )
      }
    }
    return contentTempl;
  }
}

// 文件操作类
export class FileOpt {
  app: App

  constructor(app: App) {
    this.app = app
  }

  async getMarkdownFilesFromFolderRecursively(sourcePath: string) {
    // 遍历获取文件夹下所有md文件
    const folder = this.app.vault.getAbstractFileByPath(sourcePath)
    const result: TFile[] = []
    if (folder instanceof TFolder) {
      Vault.recurseChildren(folder, (file) => {
        if (file instanceof TFile && file.extension === 'md')
          result.push(file)
      })
    }
    return result
  }
}

export class StrOpt {
  // 去掉value首尾引号，转义字符转换
  static removeConvertChar(str: string) {
    while (RE.endsWithPunctuation.test(str)) {
      // 去掉尾部标点符号
      str = str.slice(0, str.length - 1)
    }
    if (
      (str.startsWith('"') && str.endsWith('"'))
			|| (str.startsWith('\'') && str.endsWith('\''))
    )
      str = str.slice(1, str.length - 1)

    return str
      .replaceAll('\\"', '"')
      .replaceAll('\\\'', '\'')
      .replaceAll('\\n', '\n')
      .replaceAll('\\t', '\t')
      .replaceAll('\\r', '\r')
      .replaceAll('\\b', '\b')
      .replaceAll('\\f', '\f')
      .replaceAll('\\v', '\v')
      .replaceAll('\\0', '\0')
      .replaceAll('\\\\', '\\')
  }

  static getCodeBlockContent(completeCodeBlock: string) {
    return completeCodeBlock.split('\n').slice(1, -1).join('\n')
  }
}

export class RE {
  // 匹配CodeBlock前缀（```pack-source name）
  static readonly reCodeBlockPrefix4Source
    = /[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g

  static readonly reCodeBlockPrefix4View
    = /[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g

  // 匹配定义模板的CodeBlock前缀（name）
  static readonly reCodeBlockName4Source
    = /(?<=`{3,9}pack-source[\s]*)[a-zA-Z_][\w]*/g

  static readonly reCodeBlockName4View
    = /(?<=`{3,9}pack-view[\s]*)[a-zA-Z_][\w]*/g

  // 匹配需要替换的字符串（$.{varName}）
  static readonly reNeedReplaceStr = /\$\.\{[\s\S]*?\}/g

  // 匹配变量名（varName）
  // static readonly reVariableName = /(?<=\$\.\{\s*)[_a-zA-Z]\w*(?=\s*\})/g;
  static readonly reVariableName = /(?<=\$\.\{\s*)[_a-zA-Z]\w*/g

  // 正则检测变量名
  static readonly variableSynatx = /^[_a-zA-Z]\w*$/

  static readonly endsWithPunctuation = /["'][,;，；.。]+$/g

  // 无效分隔符
  // static readonly invalidSeparator = /[,，]/g;

  static getRecompleteCodeBlock(prefix: string) {
    let count = 0

    while (prefix[++count] == '`') { /* empty */ }

    return new RegExp(`${prefix}[\\s\\S]*?\`{${count}}`, 'g')
  }

  // IOS不支持后行断言
  // static getReCodeBlockContent(prefix: string) {
  // 	let count = 0;
  // 	while (prefix[++count] == "`") {}

  // 	return new RegExp(
  // 		"(?<=[`]{" +
  // 			count +
  // 			"}pack-source[\\s]*[_a-zA-Z][\\w]*\\n)[\\s\\S]*?(?=\\n`{" +
  // 			count +
  // 			"})",
  // 		"g"
  // 	);
  // }

  static getReCodeBlockPrefix(viewName: string) {
    return new RegExp(`[\`]{3,9}pack-source[\\s]*${viewName}\\n`, 'g')
  }
}

export class CodeBlockProcessor {
  private plugin: CodeBlockTemplatePlugin
  private static instance: CodeBlockProcessor

  private constructor() {}

  static getCodeBlockProcessor(plugin: CodeBlockTemplatePlugin) {
    if (CodeBlockProcessor.instance == undefined) {
      CodeBlockProcessor.instance = new CodeBlockProcessor()
      CodeBlockProcessor.instance.plugin = plugin
    }
    return CodeBlockProcessor.instance
  }

  // 从CodeBlock中提取变量名和变量值
  VariableExtractOfView(content: string) {
    const statementList = content
      .split('\n')
      .filter(word => word.length > 0)

    const keys: string[] = []
    const data_obj: UserValueData = {}
    const anonymousValues: string[] = []

    for (const statement of statementList) {
      let finished = false
      if (statement.includes('=')) {
        finished = this.extrackDisplayVariable(
          statement,
          keys,
          data_obj,
        )
      }
      if (statement.includes(',') && !finished) {
        finished = this.extrackAnonymousVariable(
          statement,
          anonymousValues,
        )
      }

      if (!finished)
        console.log('Input variable formation invalid！')
      
    }

    for (const index in anonymousValues) {
      keys.push(this.plugin.settings.anonymousVariableNamePrefix + index)
      data_obj[this.plugin.settings.anonymousVariableNamePrefix + index]
				= anonymousValues[index]
    }

    return { keys, data_obj }
  }

  extrackDisplayVariable(
    statement: string,
    keys: string[],
    data_obj: UserValueData,
  ) {
    const separatorPos = statement.indexOf('=')
    const key = statement.slice(0, separatorPos).trim()
    let value = statement.slice(separatorPos + 1).trim()

    // let [key, value] = statement.split("="); //【x】 数组解构, 可能出现一个语句有多个等号情况

    if (typeof key != typeof value && !RE.variableSynatx.test(key)) {
      console.log('Input variable formation invalid！')
      return false
    }
    value = StrOpt.removeConvertChar(value)



    data_obj[key] = value
    keys.push(key)
    return true
  }

  extrackAnonymousVariable(statement: string, values: string[]) {
    let finished = false
    let lastSeparatorPos = 0

    let dQouteMarkStart = -1
    let sQouteMarkStart = -1

    for (let pos = 0; pos < statement.length; pos++) {
      // 判断该逗号是否在引号中，在则不拆分
      switch (statement[pos]) {
        case '"':
          if (dQouteMarkStart == -1)
            dQouteMarkStart = pos
          else dQouteMarkStart = -1
          break
        case '\'':
          if (sQouteMarkStart == -1)
            sQouteMarkStart = pos
          else sQouteMarkStart = -1
          break

        default:
          break
      }

      if (sQouteMarkStart != -1 || dQouteMarkStart != -1) {
        continue
      }
      else {
        if (statement[pos] == ',') {
          let value = statement.slice(lastSeparatorPos, pos).trim()
          value = StrOpt.removeConvertChar(value)
          values.push(value)
          lastSeparatorPos = pos + 1
          finished = true
        }
        else if (pos == statement.length - 1) {
          let value = statement.slice(lastSeparatorPos).trim()
          value = StrOpt.removeConvertChar(value)
          values.push(value)
        }
      }
    }

    return finished
  }

  async getTemplContent(viewName: string, source: string) {
    const converter = V2SConverter.getV2SConverter(
      this.plugin.app,
      this.plugin.settings.sourceName2FilePath,
    )

    // __________________提取Key和Value__________________
    const { keys, data_obj } = this.VariableExtractOfView(source)

    const template = await converter.getSourceContentOfCBName(viewName)
    if(template == undefined) return undefined;

    return converter.insertVariable(template, keys,data_obj);
  }

  getCodeBlockIdentifier(ctx: MarkdownPostProcessorContext, el: HTMLElement) {
    const cbInfo = ctx.getSectionInfo(el)
    const viewName = cbInfo?.text
      .split('\n')[cbInfo.lineStart].match(RE.reCodeBlockName4View)?.[0]
    return viewName
  }
}

export class ViewManager {
  private name2View: Key2List;
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

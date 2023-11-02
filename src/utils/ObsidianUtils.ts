import type {
  App,
} from 'obsidian'
import {
  Notice,
  TFile,
  TFolder,
  Vault,
} from 'obsidian'
import type { Name2Path, UserValueData } from 'src/model/ReflexModel'

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
          const aline = contentTempl.match(new RegExp(`.*?\\$\\.\\{${varName}\\}.*[\n]?`))?.[0] ?? "";
          if(aline == "") continue;
          let loopContent = ""
          const list = values[varName].slice(1, values[varName].length - 1).split(',');
          for(const value of list) {
            if(aline.startsWith(">")){
              loopContent += aline?.replaceAll(nrStr, value)
            }else{
              loopContent += aline?.replaceAll(nrStr, value) + "\n"
            }
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

  async getAllCodeBlocks(file: TFile) {
    const content = await this.app.vault.cachedRead(file)
    const prefixs = content.match(RE.reCodeBlockPrefix4Source)
    const codeBlocks: string[] = [];

    prefixs?.forEach((prefix) => {
      codeBlocks.push(content.match(RE.getRecompleteCodeBlock(prefix))?.[0] ?? "")
    })

    return codeBlocks;
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
    = /[`]{3,}pack-source[\s]*(\S+){1}\n/g

  static readonly reCodeBlockPrefix4View
    = /[`]{3,}pack-source[\s]*[a-zA-Z_][\w]*\n/g

  // 从source前缀中匹配sourceName
  static readonly reCodeBlockName4Source
    = /(?<=`{3,}pack-source[\s]*)(\S+){1}/g

  // 从view前缀中匹配viewName
  static readonly reCodeBlockName4View
    = /(?<=`{3,}pack-view[\s]*)(\S+){1}$/g

static readonly reCsvCodeBlockName4View
	= /(?<=`{3,}pack-view-csv[\s]*)(\S+){1}$/g

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

  // 匹配完整的CodeBlock（prefix为```pack-source name)
  static getRecompleteCodeBlock(prefix: string) {
    let count = 0

    while (prefix[++count] === '`') { /* empty */ }

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



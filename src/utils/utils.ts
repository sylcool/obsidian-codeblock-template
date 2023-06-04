import {
	App,
	MarkdownPostProcessorContext,
	Notice,
	TFile,
	TFolder,
	Vault,
} from "obsidian";
import CodeBlockTemplatePlugin from "src/main";
import { Name2Path, UserValueData } from "src/model/ReflexModel";

export class V2SConverter {
	private app: App;
	private codeName2Path: Name2Path;
	private static instance: V2SConverter;

	private constructor(app: App, codeName2Path: Name2Path) {
		this.app = app;
		this.codeName2Path = codeName2Path;
	}

	static getV2SConverter(app: App, codeName2Path: Name2Path) {
		if (V2SConverter.instance == undefined) {
			V2SConverter.instance = new V2SConverter(app, codeName2Path);
		} else {
			V2SConverter.instance.codeName2Path = codeName2Path;
		}
		return V2SConverter.instance;
	}

	async getSourceContentOfCBName(
		viewName: string,
		keys: string[],
		values: UserValueData
	) {
		// ___________________定位到文件，并读取内容___________________
		const filePath = this.codeName2Path[viewName];
		if (filePath == undefined) {
			new Notice("Pack-View name invalid！");
			return undefined;
		}

		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;

		const content = await this.app.vault.read(file);

		// ___________________提取对应viewName的CodeBlock内容___________________
		// 通过前缀匹配CodeBlock
		const cbPrefix = content.match(RE.getReCodeBlockPrefix(viewName))?.[0];
		if (cbPrefix == null) return undefined;

		const completeCodeBlock = content.match(
			RE.getRecompleteCodeBlock(cbPrefix)
		)?.[0];
		if (completeCodeBlock == undefined) {
			new Notice("Pack-Source prefix formation invalid！");
			return undefined;
		}

		const contentOfCodeBlock =
			StrOpt.getCodeBlockContent(completeCodeBlock);

		if (contentOfCodeBlock == undefined) {
			new Notice("Pack-Source content formation invalid！");
			return undefined;
		}

		if (keys.length == 0) {
			console.log("No variables are used!");
			return contentOfCodeBlock;
		}

		const needReplaceList = Array.from(
			new Set(contentOfCodeBlock.match(RE.reNeedReplaceStr))
		);
		if (needReplaceList == null) {
			new Notice("Replace invalid！More info in console.");
			console.log(
				"The passed-in variable name does not match the variable name in the template"
			);
			return contentOfCodeBlock;
		}

		let contentTempl = contentOfCodeBlock;
		for (const nrStr of needReplaceList) {
			const varName = nrStr.match(RE.reVariableName)?.[0];
			if (varName == null) {
				new Notice("Replace invalid！More info in console.");
				new Notice("Source variable name invalid！");
				continue;
			}

			if (keys.includes(varName)) {
				contentTempl = contentTempl.replaceAll(nrStr, values[varName]);
			} else {
				new Notice("Replace invalid！More info in console.");
				console.log(
					"Replace invalid：The input variable and the variable to be replaced have different names."
				);
			}
		}
		return contentTempl;
	}
}

// 文件操作类
export class FileOpt {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async getMarkdownFilesFromFolderRecursively(sourcePath: string) {
		// 遍历获取文件夹下所有md文件
		const folder = this.app.vault.getAbstractFileByPath(sourcePath);
		const result: TFile[] = [];
		if (folder instanceof TFolder) {
			Vault.recurseChildren(folder, (file) => {
				if (file instanceof TFile && file.extension === "md") {
					result.push(file);
				}
			});
		}
		return result;
	}
}

export class StrOpt {
	// 去掉value首尾引号，转义字符转换
	static removeConvertChar(str: string) {
		while (RE.endsWithPunctuation.test(str)) {
			// 去掉尾部标点符号
			str = str.slice(0, str.length - 1);
		}
		if (
			(str.startsWith('"') && str.endsWith('"')) ||
			(str.startsWith("'") && str.endsWith("'"))
		) {
			str = str.slice(1, str.length - 1);
		}
		return str
			.replaceAll('\\"', '"')
			.replaceAll("\\'", "'")
			.replaceAll("\\n", "\n")
			.replaceAll("\\t", "\t")
			.replaceAll("\\r", "\r")
			.replaceAll("\\b", "\b")
			.replaceAll("\\f", "\f")
			.replaceAll("\\v", "\v")
			.replaceAll("\\0", "\0")
			.replaceAll("\\\\", "\\");
	}

	static getCodeBlockContent(completeCodeBlock: string) {
		return completeCodeBlock.split("\n").slice(1, -1).join("\n");
	}
}

export class RE {
	// 匹配CodeBlock前缀（```pack-source name）
	static readonly reCodeBlockPrefix4Source =
		/[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g;
	static readonly reCodeBlockPrefix4View =
		/[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g;

	// 匹配定义模板的CodeBlock前缀（name）
	static readonly reCodeBlockName4Source =
		/(?<=`{3,9}pack-source[\s]*)[a-zA-Z_][\w]*/g;
	static readonly reCodeBlockName4View =
		/(?<=`{3,9}pack-view[\s]*)[a-zA-Z_][\w]*/g;

	// 匹配需要替换的字符串（$.{varName}）
	static readonly reNeedReplaceStr = /\$\.\{[\s\S]*?\}/g;

	// 匹配变量名（varName）
	// static readonly reVariableName = /(?<=\$\.\{\s*)[_a-zA-Z]\w*(?=\s*\})/g;
	static readonly reVariableName = /(?<=\$\.\{\s*)[_a-zA-Z]\w*/g;

	// 正则检测变量名
	static readonly variableSynatx = /^[_a-zA-Z]\w*$/;

	static readonly endsWithPunctuation = /["'][,;，；.。]+$/g;

	// 无效分隔符
	// static readonly invalidSeparator = /[,，]/g;

	static getRecompleteCodeBlock(prefix: string) {
		let count = 0;

		while (prefix[++count] == "`") {}

		return new RegExp(prefix + "[\\s\\S]*?`{" + count + "}", "g");
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
		return new RegExp("[`]{3,9}pack-source[\\s]*" + viewName + "\\n", "g");
	}
}

export class CodeBlockProcessor {
	private plugin: CodeBlockTemplatePlugin;
	private static instance: CodeBlockProcessor;

	private constructor() {}

	static getCodeBlockProcessor(plugin: CodeBlockTemplatePlugin) {
		if (CodeBlockProcessor.instance == undefined) {
			CodeBlockProcessor.instance = new CodeBlockProcessor();
			CodeBlockProcessor.instance.plugin = plugin;
		}
		return CodeBlockProcessor.instance;
	}

	// 从CodeBlock中提取变量名和变量值
	VariableExtractOfView(content: string) {
		const statementList = content
			.split("\n")
			.filter((word) => word.length > 0);

		const keys: string[] = [];
		const data_obj: UserValueData = {};
		const anonymousValues: string[] = [];

		for (const statement of statementList) {
			let finished = false;
			if (statement.indexOf("=") != -1) {
				finished = this.extrackDisplayVariable(
					statement,
					keys,
					data_obj
				);
			}
			if (statement.indexOf(",") != -1 && !finished) {
				finished = this.extrackAnonymousVariable(
					statement,
					anonymousValues
				);
			}

			if (!finished) console.log("Input variable formation invalid！");
		}

		for (const index in anonymousValues) {
			keys.push(this.plugin.settings.anonymousVariableNamePrefix + index);
			data_obj[this.plugin.settings.anonymousVariableNamePrefix + index] =
				anonymousValues[index];
		}

		return { keys, data_obj };
	}

	extrackDisplayVariable(
		statement: string,
		keys: string[],
		data_obj: UserValueData
	) {
		const separatorPos = statement.indexOf("=");
		let key = statement.slice(0, separatorPos).trim();
		let value = statement.slice(separatorPos + 1).trim();

		// let [key, value] = statement.split("="); // 数组解构, 可能一个语句有多个等号

		if (typeof key != typeof value && !RE.variableSynatx.test(key)) {
			console.log("Input variable formation invalid！");
			return false;
		}
		value = StrOpt.removeConvertChar(value);

		data_obj[key] = value;
		keys.push(key);
		return true;
	}

	extrackAnonymousVariable(statement: string, values: string[]) {
		let finished = false;
		let lastSeparatorPos = 0;

		let dQouteMarkStart = -1;
		let sQouteMarkStart = -1;

		for (let pos = 0; pos < statement.length; pos++) {
			switch (statement[pos]) {
				case '"':
					if (dQouteMarkStart == -1) dQouteMarkStart = pos;
					else dQouteMarkStart = -1;
					break;
				case "'":
					if (dQouteMarkStart == -1) dQouteMarkStart = pos;
					else dQouteMarkStart = -1;
					break;

				default:
					break;
			}

			if (sQouteMarkStart != -1 || dQouteMarkStart != -1) {
				continue;
			} else {
				if (statement[pos] == ",") {
					let value = statement.slice(lastSeparatorPos, pos).trim();
					value = StrOpt.removeConvertChar(value);
					values.push(value);
					lastSeparatorPos = pos + 1;
					finished = true;
				} else if (pos == statement.length - 1) {
					let value = statement.slice(lastSeparatorPos).trim();
					value = StrOpt.removeConvertChar(value);
					values.push(value);
				}
			}
		}

		if (!finished) {
		}

		return finished;
	}

	getTemplContent(viewName: string, source: string) {
		const converter = V2SConverter.getV2SConverter(
			this.plugin.app,
			this.plugin.settings.sourceName2FilePath
		);

		// __________________提取Key和Value__________________
		const { keys, data_obj } = this.VariableExtractOfView(source);

		return converter.getSourceContentOfCBName(viewName, keys, data_obj);
	}

	getCodeBlockName(ctx: MarkdownPostProcessorContext, el: HTMLElement) {
		const cbInfo = ctx.getSectionInfo(el);
		const viewName = cbInfo?.text
			.split("\n")
			[cbInfo.lineStart].match(RE.reCodeBlockName4View)?.[0];

		return viewName;
	}
}

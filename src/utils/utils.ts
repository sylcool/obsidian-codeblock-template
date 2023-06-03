import { App, Notice, TFile, TFolder, Vault } from "obsidian";
import { Name2Path, UserValueData } from "src/model/ReflexModel";

export class V2SConverter {
	app: App;
	codeName2Path: Name2Path;

	constructor(app: App, codeName2Path: Name2Path) {
		this.app = app;
		this.codeName2Path = codeName2Path;
	}

	updateCodeName2Path(codeName2Path: Name2Path) {
		this.codeName2Path = codeName2Path;
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

		const needReplaceList = contentOfCodeBlock?.match(RE.reNeedReplaceStr);
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
				contentTempl = contentOfCodeBlock.replaceAll(
					nrStr,
					values[varName]
				);
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
		if (str.startsWith('"') && str.endsWith('"')) {
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

	// 匹配转义字符
	static readonly conChar = /(\\\\)+[a-zA-Z]?/g;

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

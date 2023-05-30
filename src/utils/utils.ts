import { App, Notice, TFile } from "obsidian";
import { Name2Path } from "src/model/ReflexModel";
import { ValueData } from "src/model/ValueData";

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
		values: ValueData
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
		const cbPrefix = content.match(RE.getReCodeBlockPrefix(viewName))?.[0]; // ?.[0]这个写法有点奇怪，没用过可以记一下
		if (cbPrefix == null) return undefined;

		const completionCodeBlock = content.match(
			RE.getReCompletionCodeBlock(cbPrefix)
		)?.[0];
		if (completionCodeBlock == undefined) {
			new Notice("Pack-Source prefix formation invalid！");
			return undefined;
		}

		const contentOfCodeBlock = completionCodeBlock.match(
			RE.getReCodeBlockContent(cbPrefix)
		)?.[0];
		if (contentOfCodeBlock == undefined) {
			new Notice("Pack-Source content formation invalid！");
			return undefined;
		}

		const needReplaceList = contentOfCodeBlock?.match(RE.reNeedReplaceStr);
		if (needReplaceList == null) {
			console.log("There are no variables to replace！");
			return contentOfCodeBlock;
		}

		let contentTempl = contentOfCodeBlock;
		for (const nrStr of needReplaceList) {
			const varName = nrStr.match(RE.reVariableName)?.[0];
			if (varName == null) {
				new Notice("Source Variable name invalid！");
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

export class FileOpt {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async listAllFile(sourcePath: string, mdPaths: string[]) {
		const dir = await this.app.vault.adapter.list(sourcePath);
		for (const folderPath of dir.folders) {
			if (
				folderPath.indexOf("./.obsidian/") != -1 ||
				folderPath.indexOf("./.trash/") != -1
			)
				continue; // 忽略.obsidian和.trash文件夹
			this.listAllFile(folderPath, mdPaths);
		}
		for (const filePath of dir.files) {
			if (filePath.indexOf(".md") != -1) mdPaths.push(filePath);
		}
	}

	async findMarkdomName(input: string, mdPaths: string[]) {
		const dir = await this.app.vault.adapter.list(".");
		for (const folderPath of dir.folders) {
			if (
				folderPath.indexOf("./.obsidian/") != -1 ||
				folderPath.indexOf("./.trash/") != -1 ||
				folderPath.indexOf(input) != -1
			)
				continue; // 忽略.obsidian和.trash文件夹
			this.findMarkdomName(folderPath, mdPaths);
		}
		for (const filePath of dir.files) {
			if (filePath.indexOf(".md") != -1) mdPaths.push(filePath);
		}
	}
}

export class StrOpt {
	static removeConvertChar(str: string) {
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
}

export class RE {
	// 匹配CodeBlock前缀（```pack-source name）
	static readonly reCodeBlockPrefix4Source =
		/[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g;
	static readonly reCodeBlockPrefix4View =
		/[`]{3,9}pack-source[\s]*[a-zA-Z_][\w]*\n/g;

	// 匹配CodeBlock前缀（name）
	static readonly reCodeBlockName4Source =
		/(?<=`{3,9}pack-source[\s]*)[a-zA-Z_][\w]*/g;
	static readonly reCodeBlockName4View =
		/(?<=`{3,9}pack-view[\s]*)[a-zA-Z_][\w]*/g;

	// 匹配需要替换的字符串（$.{varName}）
	static readonly reNeedReplaceStr = /\$\.\{[\s\S]*?\}/g;

	// 匹配变量名（varName）
	static readonly reVariableName = /(?<=\$\.\{\s*)[_a-zA-Z]\w*(?=\s*\})/g;

	// 正则检测变量名
	static readonly variableSynatx = /^[_a-zA-Z]\w*$/;

	// 匹配转义字符
	static readonly conChar = /(\\\\)+[a-zA-Z]?/g;

	static getReCompletionCodeBlock(prefix: string) {
		let count = 0;

		while (prefix[++count] == "`") {}

		return new RegExp(prefix + "[\\s\\S]*?`{" + count + "}", "g");
	}

	static getReCodeBlockContent(prefix: string) {
		let count = 0;
		while (prefix[++count] == "`") {}

		return new RegExp(
			"(?<=[`]{" +
				count +
				"}pack-source[\\s]*[_a-zA-Z][\\w]*\\n)[\\s\\S]*?(?=\\n`{" +
				count +
				"})",
			"g"
		);
	}

	static getReCodeBlockPrefix(viewName: string) {
		return new RegExp("[`]{3,9}pack-source[\\s]*" + viewName + "\\n", "g");
	}
}

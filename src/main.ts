import {
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Notice,
	Plugin,
} from "obsidian";
import { FileOpt, StrOpt, V2SConverter } from "./utils/utils";
import { Name2Path } from "./model/ReflexModel";
import { RE } from "./utils/utils";
import { ValueData } from "./model/ValueData";
import {
	DEFAULT_SETTINGS,
	CodeBlockTemplatePluginSettings,
	CodeBlockTemplateSettingTab,
	// CodeBlockTemplateSettingTab,
} from "./settings/CodeBlockTemplateSetTab";
import { Key2List } from "./model/ViewMesModel";

export default class CodeBlockTemplatePlugin extends Plugin {
	settings: CodeBlockTemplatePluginSettings;

	isEvent: boolean = false;

	sourceNameList: string[] = [];
	oldSourceNameList: string[] = [];

	sourceName2FilePath: Name2Path = {};
	oldSourceName2FilePath: Name2Path = {};

	cbInfos: Key2List = {};

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CodeBlockTemplateSettingTab(this.app, this));

		// __________________初始化__________________
		await this.initialize();
		if (this.settings.sourcePath === "")
			new Notice("CodeBlockTemplate Plugin：Source Path is undefined！");
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		this.settings.viewCodeBlockInfos = this.cbInfos;
		await this.saveData(this.settings);
	}

	async initialize() {
		/**
		 * 初始化插件
		 * 1. 获取Pack-Source的Names—>FilePath对应关系
		 * 2. 注册MarkdownCodeBlockProcessor（pack-source、pack-view）
		 */
		await this.getSourceName2FilePath();

		this.registerMarkdownCodeBlockProcessor(
			"pack-view",
			(source, el, ctx) => {
				// __________________获取viewName__________________
				const viewName = this.getCodeBlockName(ctx, el);
				if (viewName == undefined) return;

				// __________________将TemplContent渲染到页面__________________
				// 设置el的id，用于重新渲染
				el.className = "pack-view-" + viewName;

				// 将信息存入cbinfos
				this.cbInfos[viewName] = {
					source: source,
					elID: el.id,
					path: ctx.sourcePath,
				};
				this.saveSettings();

				this.render(viewName, source, ctx.sourcePath);
			}
		);

		this.registerMarkdownCodeBlockProcessor(
			"pack-source",
			async (source, el, ctx) => {
				el.createEl("pre").createEl("code", { text: source });
				await this.getSourceName2FilePath();
				const sourceName = this.getCodeBlockName(ctx, el);
				if (sourceName == undefined) return;

				const cbInfoItem = this.cbInfos[sourceName];

				if (this.settings.viewCodeBlockInfos[sourceName] != undefined)
					this.render(sourceName, cbInfoItem.source, cbInfoItem.path);
			}
		);
	}

	async getSourceName2FilePath() {
		/**
		 * （备注：Pack-Source变更时要更新）
		 * 用于更新sourceName2FilePath
		 */

		const fopt = new FileOpt(this.app);

		this.oldSourceNameList = this.sourceNameList;
		this.oldSourceName2FilePath = this.sourceName2FilePath;

		this.sourceName2FilePath = {};
		this.sourceNameList = [];

		if (!(await this.app.vault.adapter.exists(this.settings.sourcePath)))
			return;

		const sourceFiles: string[] = [];
		await fopt.listAllFile(this.settings.sourcePath, sourceFiles);

		for (const filePath of sourceFiles) {
			const content = await this.app.vault.adapter.read(filePath);

			const allCodeblockName = content.match(RE.reCodeBlockName4Source);
			if (allCodeblockName == null) return;
			for (const cbname of allCodeblockName) {
				this.sourceName2FilePath[cbname] = filePath;
				this.sourceNameList.push(cbname);
			}
		}
	}

	async getTemplContent(viewName: string, source: string) {
		const converter = new V2SConverter(this.app, this.sourceName2FilePath);

		// __________________提取Key和Value__________________
		const keys: string[] = [];
		const data_obj: ValueData = {};
		const words = source.split("\n").filter((word) => word.length > 0);
		for (const w of words) {
			let [key, value] = w.split("="); // 数组解构

			key = key.trim();
			value = value.trim();

			// 去掉value首尾引号
			if (value.startsWith('"') && value.endsWith('"')) {
				value = value.slice(1, value.length - 1);
			}

			value = StrOpt.removeConvertChar(value);

			if (typeof key != typeof value || !RE.variableSynatx.test(key)) {
				new Notice(
					"Data formation invalid！Maybe the variable name is not in the right format. "
				);
				return;
			}

			data_obj[key] = value;
			keys.push(key);
		}

		return await converter.getSourceContentOfCBName(
			viewName,
			keys,
			data_obj
		);
	}

	render2TemplContent(
		viewName: string,
		templContent: string | undefined,
		path: string
	) {
		const els = document.getElementsByClassName("pack-view-" + viewName);
		for (let index = 0; index < els.length; index++) {
			const el = els[index] as HTMLElement;

			if (el == null) {
				return;
			}

			el.empty();
			if (templContent != undefined) {
				MarkdownRenderer.renderMarkdown(templContent, el, path, this);
			} else {
				MarkdownRenderer.renderMarkdown("", el, path, this);
			}
		}
	}

	async render(viewName: string, source: string, path: string) {
		const templContent = await this.getTemplContent(viewName, source);

		this.render2TemplContent(viewName, templContent, path);
	}

	async renderAll() {
		if (this.sourceNameList.length != 0)
			for (const sourceName of this.sourceNameList) {
				if (this.cbInfos[sourceName] != undefined) {
					const cbInfoItem = this.cbInfos[sourceName];
					this.render(sourceName, cbInfoItem.source, cbInfoItem.path);
				}
			}
		else if (this.oldSourceNameList.length != 0)
			for (const sourceName of this.oldSourceNameList) {
				if (this.cbInfos[sourceName] != undefined) {
					const cbInfoItem = this.cbInfos[sourceName];
					this.render2TemplContent(
						sourceName,
						undefined,
						cbInfoItem.path
					);
				}
			}
	}

	getCodeBlockName(ctx: MarkdownPostProcessorContext, el: HTMLElement) {
		const cbInfo = ctx.getSectionInfo(el);
		const viewName = cbInfo?.text
			.split("\n")
			[cbInfo.lineStart].match(RE.reCodeBlockName4View)?.[0];

		return viewName;
	}
}

import { MarkdownRenderer, Notice, Plugin, TFile } from "obsidian";
import { CodeBlockProcessor, FileOpt } from "./utils/utils";
import { Name2Path } from "./model/ReflexModel";
import { RE } from "./utils/utils";
import {
	DEFAULT_SETTINGS,
	CodeBlockTemplatePluginSettings,
	CodeBlockTemplateSettingTab,
} from "./settings/CodeBlockTemplateSetTab";
import { Key2List } from "./model/ViewMesModel";

export default class CodeBlockTemplatePlugin extends Plugin {
	settings: CodeBlockTemplatePluginSettings;

	viewCodeBlockInfos: Key2List = {};

	oldSourceNameList: string[] = [];
	oldSourceName2FilePath: Name2Path = {};

	codeblockProcessor: CodeBlockProcessor;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CodeBlockTemplateSettingTab(this.app, this));

		this.codeblockProcessor =
			CodeBlockProcessor.getCodeBlockProcessor(this);

		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.sourceNameList.length == 0) {
				await this.getSourceName2FilePath();
				this.renderAll();
			}
		});

		this.registerMarkdownCodeBlockProcessor(
			"pack-view",
			(source, el, ctx) => {
				// __________________获取viewName__________________
				const viewName = this.codeblockProcessor.getCodeBlockName(
					ctx,
					el
				);
				if (viewName == undefined) return;

				// __________________将TemplContent渲染到页面__________________
				// 设置el的id，用于重新渲染
				el.className = "pack-view-" + viewName;

				// 保存CodeBlock信息
				this.viewCodeBlockInfos[viewName] = {
					source: source,
					path: ctx.sourcePath,
				};

				this.render(viewName, source, ctx.sourcePath);
			}
		);

		this.registerMarkdownCodeBlockProcessor(
			"pack-source",
			async (source, el, ctx) => {
				el.createEl("pre").createEl("code", { text: source });
				await this.getSourceName2FilePath();
				const sourceName = this.codeblockProcessor.getCodeBlockName(
					ctx,
					el
				);
				if (sourceName == undefined) return;

				const cbInfoItem = this.viewCodeBlockInfos[sourceName];

				if (cbInfoItem)
					this.render(sourceName, cbInfoItem.source, cbInfoItem.path);
			}
		);

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
		await this.saveData(this.settings);
	}

	async getSourceName2FilePath() {
		/**
		 * 功能：
		 * 1. 获取模板名称到文件路径的对应关系，方便查找模板文件，避免每次查找都遍历Source Path下的所有文件
		 * 2. 获取最新的模板列表，判断使用的模板是否已经定义
		 *
		 * 更新sourceName2FilePath、sourceNameList
		 */

		const fopt = new FileOpt(this.app);

		this.oldSourceNameList = this.settings.sourceNameList;
		this.oldSourceName2FilePath = this.settings.sourceName2FilePath;

		this.settings.sourceName2FilePath = {};
		this.settings.sourceNameList = [];

		const tfiles: TFile[] =
			await fopt.getMarkdownFilesFromFolderRecursively(
				this.settings.sourcePath
			);

		for (const tfile of tfiles) {
			const content = await this.app.vault.cachedRead(tfile);

			const allCodeblockName = content.match(RE.reCodeBlockName4Source);
			if (allCodeblockName == null) return;
			for (const cbname of allCodeblockName) {
				this.settings.sourceName2FilePath[cbname] = tfile.path;
				this.settings.sourceNameList.push(cbname);
			}
		}
		this.saveSettings();
	}

	renderFromTemplContent(
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
		const templContent = await this.codeblockProcessor.getTemplContent(
			viewName,
			source
		);

		this.renderFromTemplContent(viewName, templContent, path);
	}

	async renderAll() {
		if (this.settings.sourceNameList.length != 0)
			for (const sourceName of this.settings.sourceNameList) {
				const cbInfoItem = this.viewCodeBlockInfos[sourceName];
				if (cbInfoItem) {
					this.render(sourceName, cbInfoItem.source, cbInfoItem.path);
				}
			}
		else if (this.oldSourceNameList.length != 0)
			for (const sourceName of this.oldSourceNameList) {
				const cbInfoItem = this.viewCodeBlockInfos[sourceName];
				if (cbInfoItem) {
					this.renderFromTemplContent(
						sourceName,
						undefined,
						cbInfoItem.path
					);
				}
			}
	}
}

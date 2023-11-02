import {ViewToContentConverter} from "./ViewToContentConverter";
import {CodeBlockPostViewInfo} from "../model/ViewMesModel";
import {UserValueData} from "../model/ReflexModel";
import {RE, StrOpt, V2SConverter} from "../utils/ObsidianUtils";
import CodeBlockTemplatePlugin from "../main";

export class DefaultTextConverter implements ViewToContentConverter{

	private _plugin: CodeBlockTemplatePlugin;

	constructor(plugin: CodeBlockTemplatePlugin){
		this._plugin = plugin;
	}


	async convert(view: CodeBlockPostViewInfo): Promise<string> {
		const converter = V2SConverter.getV2SConverter(
			this._plugin.app,
			this._plugin.settings.sourceName2FilePath,
		)
		// __________________提取Key和Value__________________
		const { keys, data_obj } = this.variableExtractOfView(view.input)

		const template = await converter.getSourceContentOfCBName(view.name)
		if(template == undefined) return '';

		return converter.insertVariable(template, keys, data_obj);
	}

	supportViewInputType(): string {
		return "text";
	}


	// 从CodeBlock中提取变量名和变量值
	variableExtractOfView(content: string) {
		const statementList = content
			.split('\n')
			.filter(word => word.length > 0)

		const keys: string[] = []
		const data_obj: UserValueData = {}
		const anonymousValues: string[] = []
		// 实现多行值
		let multiStartPos = 0;
		let isMulti = false;
		let multiLine = "";

		for (let statement of statementList) {

			if(statement.indexOf("{%") !== -1){
				multiLine = statement;
				multiStartPos = content.indexOf("{%", multiStartPos);
				isMulti = true;
				continue;
			}

			if(statement.indexOf("%}") !== -1){
				isMulti = false;
				statement = multiLine.replace("{%", content.slice(multiStartPos+2, content.indexOf("%}", multiStartPos)));
				multiStartPos = content.indexOf("%}", multiStartPos);
			}

			if(isMulti) continue;

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
			keys.push(this._plugin.settings.anonymousVariableNamePrefix + index)
			data_obj[this._plugin.settings.anonymousVariableNamePrefix + index]
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
		console.log(key, value)

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
		let middleBracketStart = -1

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
				case '[':
					middleBracketStart = pos
					break
				case ']':
					middleBracketStart = -1
					break
				default:
					break
			}

			if (sQouteMarkStart != -1 || dQouteMarkStart != -1 || middleBracketStart != -1) {
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

}

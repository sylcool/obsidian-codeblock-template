import {ViewToContentConverter} from "./ViewToContentConverter";
import {CodeBlockPostViewInfo} from "../model/ViewMesModel";
import {UserValueData} from "../model/ReflexModel";
import {RE, StrOpt, V2SConverter} from "../utils/ObsidianUtils";
import CodeBlockTemplatePlugin from "../main";
import {csv2json, json2csv} from 'json-2-csv';

export class CsvConverter implements ViewToContentConverter{

	private _plugin: CodeBlockTemplatePlugin

	constructor(plugin: CodeBlockTemplatePlugin){
		this._plugin = plugin;
	}


	async convert(view: CodeBlockPostViewInfo): Promise<string> {
		let objects = csv2json(view.input);
		const converter = V2SConverter.getV2SConverter(
			this._plugin.app,
			this._plugin.settings.sourceName2FilePath,
		)
		const template = await converter.getSourceContentOfCBName(view.name)
		if(template == undefined) return '';
		const contents: string[] = [];
		for (let obj of objects) {
			// __________________提取Key和Value__________________
			const keys: string[] = Object.keys(obj);
			const data_obj: UserValueData = {};
			for (let key of keys) {
				//@ts-ignore
				data_obj[key] = obj[key]?obj[key].toString():"";
			}
			contents.push(await converter.insertVariable(template, keys, data_obj));
		}
		return contents.join("\n");
	}

	supportViewInputType(): string {
		return "csv";
	}

}

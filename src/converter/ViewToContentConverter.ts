import {CodeBlockPostViewInfo} from "../model/ViewMesModel";

export interface ViewToContentConverter {

	supportViewInputType(): string;

	convert(view: CodeBlockPostViewInfo): Promise<string>;
}

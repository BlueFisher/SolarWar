export type FuncEmit = (event: string | Symbol, ...args: any[]) => void;

export abstract class BaseGameManagerTool {
	protected _emit: FuncEmit;

	constructor(emit: FuncEmit) {
		this._emit = emit;
	}

	abstract dispose(): void;
}
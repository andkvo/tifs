import { ILocked } from "./ILocked";

export interface ILockOperationResult<TModel> {
  ok: boolean;
  locked: ILocked<TModel> | null;
}

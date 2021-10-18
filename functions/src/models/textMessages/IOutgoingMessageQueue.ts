import { ILocked } from "../../domain/ILocked";
import { ILockOperationResult } from "../../domain/ILockOperationResult";
import { IIdentity } from "../common/IIdentity";
import { IQueuedBroadcast } from "./IQueuedBroadcast";

export interface IOutgoingMessageQueue {
  add(message: IQueuedBroadcast): Promise<IQueuedBroadcast & IIdentity>;
  takeSendingLock(queuedMessageId: string): Promise<ILockOperationResult<IQueuedBroadcast & IIdentity>>;
  releaseSendingLock(lock: ILocked<IQueuedBroadcast & IIdentity>, success: boolean): Promise<void>;
}

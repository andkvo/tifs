import { IIdentity } from "../common/IIdentity";
import { IQueuedBroadcast } from "./IQueuedBroadcast";

export interface IOutgoingMessageQueue {
  add(message: IQueuedBroadcast): Promise<IQueuedBroadcast & IIdentity>;
}

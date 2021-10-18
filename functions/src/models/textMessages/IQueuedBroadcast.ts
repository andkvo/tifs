import { ISmsSubscriber } from "../subscribers/ISmsSubscriber";

export enum QueuedBroadcastStatus {
  QUEUED,
  SENDING,
  ERROR,
  SENT,
}

export interface IQueuedBroadcast {
  recipients: Array<ISmsSubscriber>;
  message: string;
  status: QueuedBroadcastStatus;
  createdOn: number;
  lock?: string;
}

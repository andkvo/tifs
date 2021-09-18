import { ISmsSubscriber } from "../subscribers/ISmsSubscriber";

export interface IQueuedBroadcast {
  recipients: Array<ISmsSubscriber>;
  message: string;
  status: string;
  createdOn: number;
}

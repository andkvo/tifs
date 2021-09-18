import { ClientOrganization } from "../clientOrganizations/ClientOrganization";
import { ISmsSubscriber } from "../subscribers/ISmsSubscriber";
import { IQueuedBroadcast } from "./IQueuedBroadcast";

const SMS_CHUNK_LENGTH = 150;
const SMS_MAX_LENGTH = 1600;

export class QueuedBroadcast implements IQueuedBroadcast {
  #client: ClientOrganization;

  public message: string;
  public recipients: Array<ISmsSubscriber>;
  public status: string;
  public createdOn: number;

  constructor(client: ClientOrganization, recipients: Array<ISmsSubscriber>, message: string) {
    this.#client = client;
    this.message = message;
    this.recipients = recipients;
    this.status = "QUEUED";
    this.createdOn = new Date().valueOf();

    if (message.length > SMS_MAX_LENGTH) throw new Error("Message length is too long");
  }

  get cost(): number {
    const messageChunkCount = Math.ceil(this.message.length / SMS_CHUNK_LENGTH);
    return this.#client.smsCost * messageChunkCount;
  }
}

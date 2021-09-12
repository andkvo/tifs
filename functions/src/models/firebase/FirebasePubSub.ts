import { IPubSub, MessageTypeTag } from "../pubsub/IPubSub";
import { IPubSubMessageInfo } from "../pubsub/IPubSubMessageInfo";
import { PubSub } from "@google-cloud/pubsub";
import * as admin from "firebase-admin";
import { Message } from "firebase-functions/lib/providers/pubsub";

export class FirebasePubSub implements IPubSub {
  async triggerMessage(tag: MessageTypeTag, payload: any): Promise<IPubSubMessageInfo> {
    const pubsub = new PubSub();
    const dataBuffer = Buffer.from(JSON.stringify(payload));

    return pubsub
      .topic(tag)
      .publish(dataBuffer)
      .then((messageId: any) => {
        return { messageId: messageId };
      });
  }

  async sendToErrorQueue(tag: MessageTypeTag, message: Message, error: string) {
    let errorCount = 1;

    if (message.attributes["errorCount"]) {
      errorCount = parseInt(message.attributes["errorCount"], 10);
    }

    await admin
      .firestore()
      .collection("pubSubErrorQueue")
      .add({
        errorCount: errorCount,
        errorMessage: error,
        errorDate: new Date(Date.now()),
        topic: tag,
        payload: message.json,
      });
  }
}

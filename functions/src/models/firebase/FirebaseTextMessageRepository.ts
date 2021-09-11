import { ITextMessageRepository } from "../textMessages/ITextMessageRepository";
import * as admin from "firebase-admin";
import { TextMessage, OutgoingTextMessage } from "../textMessages/TextMessage";
import { IIdentity } from "../common/IIdentity";

export class FirebaseTextMessageRepository implements ITextMessageRepository {
  async saveNew(textMessage: TextMessage): Promise<TextMessage & IIdentity> {
    const db = admin.firestore();
    return db
      .collection("incomingSms")
      .add(textMessage)
      .then((doc) => {
        return { id: doc.id, ...textMessage };
      });
  }

  async saveNewOutgoing(textMessage: OutgoingTextMessage): Promise<OutgoingTextMessage & IIdentity> {
    const db = admin.firestore();
    return db
      .collection("outgoingSms")
      .add(textMessage)
      .then((doc) => {
        return { id: doc.id, ...textMessage };
      });
  }
}

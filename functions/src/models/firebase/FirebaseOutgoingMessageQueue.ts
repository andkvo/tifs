import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";
import { IQueuedBroadcast } from "../textMessages/IQueuedBroadcast";
import { IOutgoingMessageQueue } from "../textMessages/IOutgoingMessageQueue";

export class FirebaseOutgoingMessageQueue implements IOutgoingMessageQueue {
  #clientId: any;
  constructor(clientId: string) {
    if (!clientId || clientId.trim() === "") throw new Error("You must include a client ID");

    this.#clientId = clientId;
  }

  async add(message: IQueuedBroadcast): Promise<IQueuedBroadcast & IIdentity> {
    return admin
      .firestore()
      .collection(`organizationPreferences/${this.#clientId}/outgoingQueue`)
      .add({ ...message })
      .then((doc) => {
        const saved = <IQueuedBroadcast & IIdentity>message;
        saved.id = doc.id;
        return saved;
      });
  }
}

import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";
import { IQueuedBroadcast, QueuedBroadcastStatus } from "../textMessages/IQueuedBroadcast";
import { IOutgoingMessageQueue } from "../textMessages/IOutgoingMessageQueue";
import { ILockOperationResult } from "../../domain/ILockOperationResult";
import { ILocked } from "../../domain/ILocked";

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

  async takeSendingLock(queuedMessageId: string): Promise<ILockOperationResult<IQueuedBroadcast & IIdentity>> {
    const ref = admin.firestore().doc(`organizationPreferences/${this.#clientId}/outgoingQueue/${queuedMessageId}`);
    const lockId = Math.ceil((Math.random() + 1) * 10000) + "";

    try {
      let queuedMessageData: (IQueuedBroadcast & IIdentity) | null = null;
      await admin.firestore().runTransaction(async (tx) => {
        const queuedMessage = await tx.get(ref);
        queuedMessageData = <IQueuedBroadcast & IIdentity>queuedMessage.data();

        if (!queuedMessageData) {
          throw new Error("Could not load message data while locking");
        }

        queuedMessageData.id = queuedMessage.id;

        if (queuedMessageData.status !== QueuedBroadcastStatus.QUEUED) {
          throw new Error("Message status was not 'queued'.");
        }

        tx.update(ref, { status: QueuedBroadcastStatus.SENDING, lock: lockId });
      });

      if (!queuedMessageData) throw new Error("Message could not be loaded");

      return { ok: true, locked: { lockId, model: queuedMessageData } };
    } catch (err) {
      console.warn("Sending Lock Failed (Lock " + lockId + ")", err);
      return { ok: false, locked: null };
    }
  }

  async releaseSendingLock(lockedMessage: ILocked<IQueuedBroadcast & IIdentity>, success: boolean): Promise<void> {
    const ref = admin
      .firestore()
      .doc(`organizationPreferences/${this.#clientId}/outgoingQueue/${lockedMessage.model.id}`);

    try {
      await admin.firestore().runTransaction(async (tx) => {
        const queuedMessage = await tx.get(ref);
        const queuedMessageData = <IQueuedBroadcast & IIdentity>queuedMessage.data();

        if (!queuedMessageData) {
          throw new Error("Could not load message data while locking");
        }

        queuedMessageData.id = queuedMessage.id;

        if (queuedMessageData.lock !== lockedMessage.lockId) {
          throw new Error("QueuedBroadcast locked by another process.");
        }

        tx.update(ref, { status: success ? QueuedBroadcastStatus.SENT : QueuedBroadcastStatus.QUEUED, lock: "" });
      });
      return;
    } catch (err) {
      console.warn("Unlocking QueuedBroadcast Failed (Message " + lockedMessage.model.id + ")");
      return;
    }
  }
}

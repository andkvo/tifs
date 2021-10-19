import * as admin from "firebase-admin";
import { FreeTrialPhoneNumber } from "../domain/FreeTrialPhoneNumber";
import { IFreeTrialPhoneNumberRepository } from "../phoneNumbers/IFreeTrialPhoneNumberRepository";

const COLLECTION_NAME = "freeTrialNumbers";

export class FirebaseFreeTrialPhoneNumberRepository implements IFreeTrialPhoneNumberRepository {
  async getAll(): Promise<Array<FreeTrialPhoneNumber>> {
    const phoneNumberCollection = await admin.firestore().collection(COLLECTION_NAME).get();
    return phoneNumberCollection.docs.map((d) => {
      const docData = d.data();
      return {
        phoneNumber: docData.phoneNumber,
        phoneNumberSid: docData.phoneNumberSid,
      };
    });
  }

  async reserveFreeTrialNumber(clientId: string): Promise<FreeTrialPhoneNumber> {
    await admin.firestore().runTransaction(async (tx) => {
      const unassignedQuery = admin.firestore().collection(COLLECTION_NAME).where("assignedTo", "==", null);
      const expiredTrialQuery = admin
        .firestore()
        .collection(COLLECTION_NAME)
        .where("assignmentExpires", "<", new Date().valueOf());

      const unassignedResults = await tx.get(unassignedQuery);
      const expiredResults = await tx.get(expiredTrialQuery);

      const firstUnassignedRef = unassignedResults.docs.pop()?.ref;
      const firstExpiredRef = expiredResults.docs.pop()?.ref;

      const numberToReserve = firstUnassignedRef || firstExpiredRef;

      if (!numberToReserve) throw new Error("Not enough phone numbers to support free trial");

      numberToReserve.set(
        { assignedTo: clientId, assignmentExpires: new Date().valueOf() + 1000 * 60 * 60 },
        { merge: true },
      );
    });

    const phoneNumberQueryResults = await admin
      .firestore()
      .collection(COLLECTION_NAME)
      .where("assignedTo", "==", clientId)
      .get();

    const doc = phoneNumberQueryResults.docs.pop();

    if (!doc) throw new Error("Unexpected error when attempting to reserve number");

    const docData = doc.data();

    return { phoneNumber: docData.phoneNumber, phoneNumberSid: docData.phoneNumberSid };
  }
}

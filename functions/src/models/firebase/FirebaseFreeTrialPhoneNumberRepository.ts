import * as admin from "firebase-admin";
import { IFreeTrialPhoneNumberRepository } from "../phoneNumbers/IFreeTrialPhoneNumberRepository";

export class FirebaseFreeTrialPhoneNumberRepository implements IFreeTrialPhoneNumberRepository {
  async getAll(): Promise<Array<string>> {
    const phoneNumberCollection = await admin.firestore().collection("freeTrialPhoneNumbers").get();
    return phoneNumberCollection.docs.map((d) => d.id);
  }
}

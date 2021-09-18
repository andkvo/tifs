import { IClientSmsSubscriberRepository } from "../subscribers/IClientSmsSubscriberRepository";
import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";
import { ISmsSubscriber } from "../subscribers/ISmsSubscriber";

export class FirebaseClientSmsSubscriberRepository implements IClientSmsSubscriberRepository {
  #clientId: any;
  constructor(clientId: string) {
    if (!clientId || clientId.trim() === "") throw new Error("You must include a client ID");

    this.#clientId = clientId;
  }

  create(subscriber: ISmsSubscriber): Promise<ISmsSubscriber & IIdentity> {
    return admin
      .firestore()
      .collection(`organizationPreferences/${this.#clientId}/subscribers`)
      .add(subscriber)
      .then((doc) => {
        const saved = <ISmsSubscriber & IIdentity>subscriber;
        saved.id = doc.id;
        return saved;
      });
  }
  async find(): Promise<Array<ISmsSubscriber & IIdentity>> {
    const col = await admin
      .firestore()
      .collection(`organizationPreferences/${this.#clientId}/subscribers`)
      .get();

    const ret: Array<ISmsSubscriber & IIdentity> = [];

    col.forEach((d) => {
      const id = d.id;
      const { firstName, lastName, phoneNumber } = d.data();
      ret.push({ id, firstName, lastName, phoneNumber, media: ["sms"] });
    });

    return ret;
  }
}

import { IUserRepository } from "../users/IUserRepository";
import * as admin from "firebase-admin";

export class FirebaseUserRepository implements IUserRepository {
  public find = (userId: string) => {
    if (!userId) {
      throw new Error("Cannot find without ID");
    }

    return admin
      .firestore()
      .collection("portalUsers")
      .doc(userId)
      .get()
      .then((doc) => {
        if (doc) {
          const data = doc.data();
          if (!data) return null;
          return {
            id: doc.id,
            clientId: data.clientId,
          };
        } else {
          return null;
        }
      });
  };
}

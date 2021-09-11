import { IAgentRepository } from "../agents/IAgentRepository";
import { Agent } from "../agents/Agent";
import * as admin from "firebase-admin";

export class FirebaseAgentRepository implements IAgentRepository {
  public lookupAgentBySlackHandle(handle: string): Promise<Agent> {
    const db = admin.firestore();
    return db
      .collection("agents")
      .where("slackUsername", "==", handle)
      .get()
      .then((querySnapshot) => {
        let agentData: any = {};

        querySnapshot.forEach((doc) => {
          agentData = doc.data();
          agentData.id = doc.id;
        });

        return {
          id: agentData.id,
          phoneNumber: agentData.phoneNumber,
          slackHandle: agentData.slackUsername,
        };
      });
  }
}

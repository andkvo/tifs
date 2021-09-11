import { IPhoneApi } from "../phoneCalls/IPhoneApi";
import * as admin from "firebase-admin";
import { Agent } from "../agents/Agent";
import { IPhoneCallRoutingRecord } from "../phoneCalls/IPhoneCallRoutingRecord";
import { IIdentity } from "../common/IIdentity";
import { PhoneCallRecord } from "../phoneCalls/PhoneCallRecord";

export class FirebaseLoggingPhoneApi implements IPhoneApi {
  async connectIncomingCallToAgent(callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }) {
    const db = admin.firestore();
    return db
      .collection("phoneCallEvents")
      .add({
        type: "answered",
        client: callData.call.clientId,
        agent: callData.agent.id,
        callingPhoneNumber: callData.call.fromNumber,
        referer: "slack",
        timestamp: Date.now(),
      })
      .then(() => {
        return callData;
      });
  }

  async rejectIncomingCall(callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }) {
    const db = admin.firestore();
    return db
      .collection("phoneCallEvents")
      .add({
        type: "rejected",
        client: callData.call.clientId,
        agent: callData.agent.id,
        callingPhoneNumber: callData.call.fromNumber,
        referer: "slack",
        timestamp: Date.now(),
      })
      .then(() => {
        return callData;
      });
  }
}

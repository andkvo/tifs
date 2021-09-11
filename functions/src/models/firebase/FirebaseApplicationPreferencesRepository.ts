import { IApplicationPreferencesRepository } from "../application/IApplicationPreferencesRepository";
import { IApplicationPreferences } from "../application/IApplicationPreferences";
import { IIdentity } from "../common/IIdentity";
import * as admin from "firebase-admin";

export class FirebaseApplicationPreferencesRepository implements IApplicationPreferencesRepository {
  async load(): Promise<(IApplicationPreferences & IIdentity) | null> {
    const db = admin.firestore();

    return db
      .collection("applicationPreferences")
      .doc("prefs")
      .get()
      .then((doc) => {
        const data = doc.data();

        if (!data) return null;

        return {
          id: doc.id,
          twimlVoiceAppSid: data.twimlVoiceAppSid,
          automaticallyApproveTexting: data.automaticallyApproveTexting,
          automaticallyApproveVoice: data.automaticallyApproveVoice,
          smsCostInTenths: data.smsCostInTenths,
          holdMusicUrl: data.holdMusicUrl,
          agentJoinCallTwimlScriptUrl: data.agentJoinCallTwimlScriptUrl,
          phoneCallMinuteCostInTenths: data.phoneCallMinuteCostInTenths,
          phoneCallRecordingMinuteCostInTenths: data.phoneCallRecordingMinuteCostInTenths,
          phoneCallTranscriptionMinuteCostInTenths: data.phoneCallTranscriptionMinuteCostInTenths,
        };
      });
  }
}

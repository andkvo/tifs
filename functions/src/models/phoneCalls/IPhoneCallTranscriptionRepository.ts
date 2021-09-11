import { IIdentity } from "../common/IIdentity";
import { PhoneCallTranscriptionRecord } from "./PhoneCallTranscriptionRecord";

export interface IPhoneCallTranscriptionRepository {
  find(id: string): Promise<PhoneCallTranscriptionRecord & IIdentity>;
  add(phoneCallRecording: PhoneCallTranscriptionRecord): Promise<PhoneCallTranscriptionRecord & IIdentity>;
}

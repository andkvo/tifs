import { PhoneConferenceRecord } from "./PhoneConferenceRecord";
import { IIdentity } from "../common/IIdentity";

export interface IPhoneConferenceRepository {
  lookupConferenceByPhoneCallId(phoneCallId: string): Promise<PhoneConferenceRecord & IIdentity>;
  add(phoneConference: PhoneConferenceRecord): Promise<PhoneConferenceRecord & IIdentity>;
}

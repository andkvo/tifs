import { PhoneCallRecordingRecord } from "./PhoneCallRecordingRecord";
import { IIdentity } from "../common/IIdentity";

export interface IPhoneCallRecordingRepository {
  find(id: string): Promise<PhoneCallRecordingRecord & IIdentity>;
  add(phoneCallRecording: PhoneCallRecordingRecord): Promise<PhoneCallRecordingRecord & IIdentity>;
  lookupByPhoneCallId(phoneCallId: string): Promise<PhoneCallRecordingRecord & IIdentity>;
  lookupByVendorId(sid: string): Promise<PhoneCallRecordingRecord & IIdentity>;
}

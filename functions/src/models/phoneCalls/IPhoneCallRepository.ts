import { PhoneCallRecord } from "./PhoneCallRecord";
import { IIdentity } from "../common/IIdentity";

export interface IPhoneCallRepository {
  find(id: string): Promise<PhoneCallRecord & IIdentity>;
  add(phoneCall: PhoneCallRecord): Promise<PhoneCallRecord & IIdentity>;
  save(phoneCall: PhoneCallRecord & IIdentity): Promise<PhoneCallRecord & IIdentity>;
  lookupByVendorId(sid: string): Promise<PhoneCallRecord & IIdentity>;
}

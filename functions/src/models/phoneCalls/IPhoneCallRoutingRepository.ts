import { IPhoneCallRoutingRecord } from "./IPhoneCallRoutingRecord";
import { IIdentity } from "../common/IIdentity";

export interface IPhoneCallRoutingRepository {
  add(record: IPhoneCallRoutingRecord): Promise<IPhoneCallRoutingRecord & IIdentity>;
  findByCallId(phoneCallId: string): Promise<IPhoneCallRoutingRecord>;
}

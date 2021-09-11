import { Agent } from "../agents/Agent";
import { IPhoneCallRoutingRecord } from "./IPhoneCallRoutingRecord";
import { PhoneCallRecord } from "./PhoneCallRecord";
import { IIdentity } from "../common/IIdentity";

export interface IPhoneApi {
  connectIncomingCallToAgent(callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }): Promise<any>;
  rejectIncomingCall(callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }): Promise<any>;
}

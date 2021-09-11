import { IPhoneApi } from "../phoneCalls/IPhoneApi";
import { TwilioPhoneApi } from "../twilio/TwilioPhoneApi";
import { Agent } from "../agents/Agent";
import { FirebaseLoggingPhoneApi } from "../firebase/FirebaseLoggingPhoneApi";
import { IPhoneCallRoutingRecord } from "../phoneCalls/IPhoneCallRoutingRecord";
import { IIdentity } from "../common/IIdentity";
import { PhoneCallRecord } from "../phoneCalls/PhoneCallRecord";

export class FirebaseLoggingTwilioPhoneApi implements IPhoneApi {
  private phoneApi: TwilioPhoneApi;
  private loggingPhoneApi: FirebaseLoggingPhoneApi;

  constructor(phoneApi: TwilioPhoneApi, loggingPhoneApi: FirebaseLoggingPhoneApi) {
    this.phoneApi = phoneApi;
    this.loggingPhoneApi = loggingPhoneApi;
  }

  connectIncomingCallToAgent = (callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }): Promise<any> => {
    return this.loggingPhoneApi.connectIncomingCallToAgent(callData).then(this.phoneApi.connectIncomingCallToAgent);
  };

  rejectIncomingCall = (callData: { agent: Agent; callRouting: IPhoneCallRoutingRecord }): Promise<any> => {
    return this.rejectIncomingCall(callData).then(this.phoneApi.connectIncomingCallToAgent);
  };
}

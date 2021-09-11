import * as twilio from "twilio";
import { IPhoneApi } from "../phoneCalls/IPhoneApi";
import * as Twilio from "twilio/lib/rest/Twilio";
import { Agent } from "../agents/Agent";
import { IPhoneCallRoutingRecord } from "../phoneCalls/IPhoneCallRoutingRecord";
import { PhoneCallRecord } from "../phoneCalls/PhoneCallRecord";
import { IIdentity } from "../common/IIdentity";

export class TwilioPhoneApi implements IPhoneApi {
  private client: Twilio;
  private twilioJoinConferenceWebhookUrl: string;

  constructor(config: { accountSid: string; authToken: string; twilioJoinConferenceWebhookUrl: string }) {
    this.client = twilio(config.accountSid, config.authToken);
    this.twilioJoinConferenceWebhookUrl = config.twilioJoinConferenceWebhookUrl;
  }

  connectIncomingCallToAgent = async (callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }): Promise<any> => {
    return this.client.api.calls.create({
      from: callData.call.toNumber,
      to: callData.agent.phoneNumber,
      url: this.twilioJoinConferenceWebhookUrl + "?callId=" + callData.call.id,
    });
  };

  rejectIncomingCall = async (callData: {
    agent: Agent;
    call: PhoneCallRecord & IIdentity;
    callRouting: IPhoneCallRoutingRecord;
  }): Promise<any> => {
    return Promise.resolve(callData);
  };
}

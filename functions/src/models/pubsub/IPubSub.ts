import { IPubSubMessageInfo } from "./IPubSubMessageInfo";
import { Message } from "firebase-functions/lib/providers/pubsub";

export type MessageTypeTag =
  | "accounting-record-inbound-sms"
  | "accounting-record-outbound-sms"
  | "slack-event"
  | "slack-interaction"
  | "slack-slash"
  | "twilio-incoming-call"
  | "provision-office"
  | "daily-tick"
  | "recording-complete"
  | "transcription-complete"
  | "phone-call-complete"
  | "incoming-sms"
  | "suspend-account"
  | "reinstate-account"
  | "funds-added"
  | "begin-free-trial-slack";

export interface IPubSub {
  triggerMessage(tag: MessageTypeTag, payload: any): Promise<IPubSubMessageInfo>;
  sendToErrorQueue(tag: MessageTypeTag, message: Message, error: string): void;
}

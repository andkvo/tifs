import { IPubSubMessageInfo } from "./IPubSubMessageInfo";
import { Message } from "firebase-functions/lib/providers/pubsub";

export type MessageTypeTag =
  | "accounting-record-inbound-sms"
  | "accounting-record-outbound-sms"
  | "slack-event"
  | "slack-interaction"
  | "slack-slash"
  | "provision-office"
  | "daily-tick"
  | "incoming-sms"
  | "suspend-account"
  | "reinstate-account"
  | "funds-added"
  | "begin-free-trial-slack"
  | "add-sms-subscriber"
  | "first-subscriber-added"
  | "broadcast-sms-from-slack"
  | "first-sms-sent";

export interface IPubSub {
  triggerMessage(tag: MessageTypeTag, payload: any): Promise<IPubSubMessageInfo>;
  sendToErrorQueue(tag: MessageTypeTag, message: Message, error: string): void;
}

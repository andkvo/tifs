export type PhoneCallRoutingType = "queue" | "conference";

export interface IPhoneCallRoutingRecord {
  callId: string;
  routingType: PhoneCallRoutingType;
  routingHandle: string;
  timestamp: Date;
}

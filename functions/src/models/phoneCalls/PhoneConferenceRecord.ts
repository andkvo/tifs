export interface PhoneConferenceRecord {
  incomingPhoneCallId: string;
  clientId: string;
  name: string;
  timestamp: Date;
  endTimestamp?: Date;
}

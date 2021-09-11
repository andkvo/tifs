export interface PhoneCallTranscriptionRecord {
  phoneCallId: string;
  vendorId: string;
  durationInSeconds: number;
  url: string;
  dateComplete: Date;
  text: string;
}

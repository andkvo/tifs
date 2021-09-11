export interface PhoneCallRecordingRecord {
  phoneCallId: string;
  vendorId: string;
  recordingDurationInSeconds: number;
  recordingUrl: string;
  recordingComplete: Date;
}

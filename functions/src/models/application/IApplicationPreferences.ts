export interface IApplicationPreferences {
  twimlVoiceAppSid: string;
  automaticallyApproveTexting: boolean;
  automaticallyApproveVoice: boolean;
  holdMusicUrl: string;
  agentJoinCallTwimlScriptUrl: string;
  smsCostInTenths: number;
  phoneCallMinuteCostInTenths: number;
  phoneCallRecordingMinuteCostInTenths: number;
  phoneCallTranscriptionMinuteCostInTenths: number;
}

import * as iots from "io-ts";
import { reporter } from "io-ts-reporters";

const TwilioWebhookRequestValidator = iots.interface({
  CallSid: iots.string,
  AccountSid: iots.string,
});

const TwilioIncomingCallRequestAdditionalPropsValidator = iots.interface({
  CallSid: iots.string,
  To: iots.string,
  CallStatus: iots.string,
  From: iots.string,
  FromCountry: iots.string,
  FromState: iots.string,
  FromCity: iots.string,
  Called: iots.string,
  ToState: iots.string,
  CallerCountry: iots.string,
  Direction: iots.string,
  CallerState: iots.string,
  ToZip: iots.string,
  CallerZip: iots.string,
  ToCountry: iots.string,
});

const TwilioOngoingCallRequestAdditionalPropsValidator = iots.partial({
  CallDuration: iots.string,
  Timestamp: iots.string,
});

const TwilioTranscriptionRequestAdditionalPropsValidator = iots.partial({
  TranscriptionText: iots.string,
  TranscriptionStatus: iots.string,
  TranscriptionType: iots.string,
  TranscriptionUrl: iots.string,
  TranscriptionSid: iots.string,
  RecordingSid: iots.string,
});

const TwilioRecordingRequestAdditionalPropsValidator = iots.partial({
  RecordingSid: iots.string,
  RecordingDuration: iots.string,
  RecordingUrl: iots.string,
  RecordingStatus: iots.string,
  RecordingChannels: iots.string,
  RecordingStartTime: iots.string,
  RecordingSource: iots.string,
});

export const TwilioIncomingCallRequestValidator = iots.intersection([
  TwilioWebhookRequestValidator,
  TwilioIncomingCallRequestAdditionalPropsValidator,
]);
export const TwilioOngoingCallRequestValidator = iots.intersection([
  TwilioIncomingCallRequestValidator,
  TwilioOngoingCallRequestAdditionalPropsValidator,
]);
export const TwilioTranscriptionRequestValidator = iots.intersection([
  TwilioWebhookRequestValidator,
  TwilioTranscriptionRequestAdditionalPropsValidator,
]);
export const TwilioRecordingStatusUpdateWebhookRequestValidator = iots.intersection([
  TwilioWebhookRequestValidator,
  TwilioRecordingRequestAdditionalPropsValidator,
]);

export type ITwilioIncomingCallRequest = iots.TypeOf<typeof TwilioIncomingCallRequestValidator>;
export type ITwilioOngoingCallRequest = iots.TypeOf<typeof TwilioOngoingCallRequestValidator>;
export type ITwilioTranscriptionUpdateRequest = iots.TypeOf<typeof TwilioTranscriptionRequestValidator>;
export type ITwilioRecordingStatusUpdateWebhookRequest = iots.TypeOf<
  typeof TwilioRecordingStatusUpdateWebhookRequestValidator
>;

export function decodeToPromise<T, O, I>(validator: iots.Type<T, O, I>, input: I): Promise<T> {
  const result = validator.decode(input);
  return result.fold(
    (errors: any) => {
      const messages = reporter(result);
      return Promise.reject(new Error(messages.join("\n")));
    },
    (value: any) => Promise.resolve(value),
  );
}

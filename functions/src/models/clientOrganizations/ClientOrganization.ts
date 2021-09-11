export interface ClientOrganization {
  organizationName: string;
  cecePhoneNumber: string;
  cecePhoneNumberTwilioSid: string;
  ceceEmailAddress: string;
  greetingStyle: string;
  slackChannelId: string;
  clientMobileNumber: string;
  requestedAreaCode: string;
  primaryContactName: string;
  websiteUrl: string;
  isAccountSuspended: boolean;
  wasTextingRequested: boolean;
  wasVoiceRequested: boolean;
  wasTextingManuallyApproved: boolean;
  wasVoiceManuallyApproved: boolean;
  minimumBalanceRequiredInTenths: number;
  warningBalanceInTenths: number;
  wasWarnedAboutBalance: boolean;
  stripeCustomerId: string;
}

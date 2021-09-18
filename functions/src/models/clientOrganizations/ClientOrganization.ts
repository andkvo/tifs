export interface ClientOrganization {
  cecePhoneNumber: string;
  cecePhoneNumberTwilioSid: string;
  organizationName: string;
  requestedAreaCode: string;
  primaryContactName: string;
  isAccountSuspended: boolean;
  minimumBalanceRequiredInTenths: number;
  warningBalanceInTenths: number;
  wasWarnedAboutBalance: boolean;
  stripeCustomerId: string;
  slackChannelId: string;
  smsCost: number;
}

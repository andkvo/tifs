export type CreditType = "Cash" | "Coupon" | "Rollup";
export type CreditSource = "PayPal" | "Stripe" | "Cash";
export type DebitSource = "Twilio" | "Labor";
export type DebitType =
  | "IncomingSMS"
  | "OutgoingSMS"
  | "IncomingEmail"
  | "OutgoingEmail"
  | "PhoneLine"
  | "RecordedTranscribedCall"
  | "RecordedCall"
  | "Call"
  | "Labor"
  | "SubscriptionFee";

export interface ClientAccountLedgerEntry {
  clientId: string;
  eventDate: Date;
  createDate: Date;
  quantity: number;
  unitValueInTenths: number;
  totalValueInTenths: number;
  oldBalanceInTenths?: number;
  newBalanceInTenths?: number;
  creditType?: CreditType;
  creditSource?: CreditSource;
  debitSource?: DebitSource;
  debitType?: DebitType;
  traceKey: string;
  finalized: boolean;
}

/*

add money

{
  clientId: 'person-adding-money',
  date: date,
  value: 500,
  newBalance: 500,
  creditType: "Cash",
  creditSource: "PayPal"
}

send text message

{
  clientId: 'person-sending-message',
  date: date,
  value: -0.01,
  newBalance: 499.99,
  debitType: 'TwilioSmsSent',
  traceKey: 'sms-db-id'
}

call recorded

{
  clientId: 'client-receiving-call',
  date: date,
  value: -1.25,
  newBalance: 498.74,
  debitType: 'TwilioPhoneCallWithRecordingAndTranscription',
  traceKey: 'phone-call-db-id'
}


call recorded

{
  clientId: 'client-getting-labor',
  date: date,
  value: -300,
  newBalance: 198.74,
  debitType: 'Labor',
  traceKey: 'phone-call-db-id'
}

*/

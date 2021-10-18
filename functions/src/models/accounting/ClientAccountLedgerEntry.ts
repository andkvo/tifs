export type CreditType = "Cash" | "Coupon" | "Rollup";
export type CreditSource = "PayPal" | "Stripe" | "Cash";
export type DebitSource = "Twilio" | "Labor";
export type DebitType = "IncomingSMS" | "OutgoingSMS" | "PhoneLine" | "SubscriptionFee";

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

*/

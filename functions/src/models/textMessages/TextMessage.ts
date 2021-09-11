export interface TwilioTextMessage {
  AccountSid: string;
  ApiVersion: string;
  Body: string;
  From: string;
  FromCity: string;
  FromCountry: string;
  FromState: string;
  FromZip: string;
  MessageSid: string;
  NumMedia: string;
  NumSegments: string;
  SmsMessageSid: string;
  SmsSid: string;
  SmsStatus: string;
  To: string;
  ToCity: string;
  ToCountry: string;
  ToState: string;
  ToZip: string;
}

export interface TextMessage {
  clientId: string;
  AccountSid: string;
  ApiVersion: string;
  Body: string;
  From: string;
  FromCity: string;
  FromCountry: string;
  FromState: string;
  FromZip: string;
  MessageSid: string;
  NumMedia: string;
  NumSegments: string;
  SmsMessageSid: string;
  SmsSid: string;
  SmsStatus: string;
  To: string;
  ToCity: string;
  ToCountry: string;
  ToState: string;
  ToZip: string;
  timestamp: Date;
}

export interface OutgoingTextMessage {
  accountSid: string;
  apiVersion: string;
  body: string;
  dateCreated: Date;
  dateUpdated: Date;
  dateSent: Date;
  direction: string;
  errorCode: number;
  errorMessage: string;
  from: string;
  messagingServiceSid: string;
  numMedia: string;
  numSegments: string;
  price: number;
  priceUnit: string;
  sid: string;
  status: string;
  to: string;
  clientId: string;
  timestamp: Date;
}

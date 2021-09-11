export interface PhoneCallRecord {
  clientId: string;
  fromNumber: string;
  toNumber: string;
  fromCity: string;
  fromState?: string;
  fromCountry?: string;
  timestamp: Date;
  vendorId: string;
  callDurationInSeconds?: number;
}

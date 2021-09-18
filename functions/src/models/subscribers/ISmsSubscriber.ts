export type SubscriberMedium = "sms";

export interface ISmsSubscriber {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  media: Array<SubscriberMedium>;
}

import { IIdentity } from "../common/IIdentity";
import { ISmsSubscriber } from "./ISmsSubscriber";

export interface IClientSmsSubscriberRepository {
  create(subscriber: ISmsSubscriber): Promise<ISmsSubscriber & IIdentity>;
  find(): Promise<Array<ISmsSubscriber & IIdentity>>;
}

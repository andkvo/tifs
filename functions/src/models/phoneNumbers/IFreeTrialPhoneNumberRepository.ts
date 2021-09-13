import { FreeTrialPhoneNumber } from "../domain/FreeTrialPhoneNumber";

export interface IFreeTrialPhoneNumberRepository {
  getAll(): Promise<Array<FreeTrialPhoneNumber>>;
}

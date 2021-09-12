export interface IFreeTrialPhoneNumberRepository {
  getAll(): Promise<Array<string>>;
}

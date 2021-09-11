import { IIdentity } from "../common/IIdentity";
import { IUser } from "./IUser";

export interface IUserRepository {
  find(userId: string): Promise<(IUser & IIdentity) | null>;
}

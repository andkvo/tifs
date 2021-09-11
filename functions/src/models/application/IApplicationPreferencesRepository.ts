import { IApplicationPreferences } from "./IApplicationPreferences";
import { IIdentity } from "../common/IIdentity";

export interface IApplicationPreferencesRepository {
  load(): Promise<(IApplicationPreferences & IIdentity) | null>;
}

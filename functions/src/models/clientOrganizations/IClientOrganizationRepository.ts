import { ClientOrganization } from "./ClientOrganization";
import { IIdentity } from "../common/IIdentity";

export interface IClientOrganizationRepository {
  lookupByOfficePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null>;
  lookupBySlackChannelId(slackChannelId: string): Promise<(ClientOrganization & IIdentity) | null>;
  lookupByClientMobilePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null>;
  create(orgPrefs: ClientOrganization): Promise<(ClientOrganization & IIdentity) | null>;
  save(orgPrefs: ClientOrganization & IIdentity): Promise<void>;
  find(uid: string): Promise<(ClientOrganization & IIdentity) | null>;
}

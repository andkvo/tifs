import { ClientOrganization } from "../clientOrganizations/ClientOrganization";
import { IIdentity } from "../common/IIdentity";

export interface SlackTeam {
  accessToken: string;
  scope: string;
  name: string;
  botUser: string;
  authedUserId: string;
  client: ClientOrganization & IIdentity;
}

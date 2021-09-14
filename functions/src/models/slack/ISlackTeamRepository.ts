import { IIdentity } from "../common/IIdentity";
import { SlackTeam } from "./SlackTeam";

export interface ISlackTeamRepository {
  create(slackTeam: SlackTeam & IIdentity): Promise<SlackTeam & IIdentity>;
  get(teamId: string): Promise<(SlackTeam & IIdentity) | null>;
}

import { BeginFreeTrialCommandFactory } from "../commands/BeginFreeTrialCommand";
import { FirebaseSlackTeamRepository } from "../models/firebase/FirebaseSlackTeamRepository";
import { CeceInteraction } from "../models/slack/CeceInteraction";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";
import { Application } from "./Application";

export class AppFactory {
  static async createAppForSlackInteraction(interaction: CeceInteraction): Promise<Application> {
    const slackTeamRepo = new FirebaseSlackTeamRepository();
    const teamId = interaction.teamId;

    if (!teamId) {
      throw new Error("Could not determine team ID from interaction");
    }

    const team = await slackTeamRepo.get(teamId);

    if (!team) {
      throw new Error("Could not find team in database");
    }

    if (!team.accessToken) {
      throw new Error("Team record did not include access token");
    }

    const userId = interaction.userId;

    if (!userId) throw new Error("User ID not found on interaction");

    const slack = new SlackWorkspaceSdk(team.accessToken);

    const freeTrialCommand = BeginFreeTrialCommandFactory(userId, slack);
    return new Application(freeTrialCommand);
  }
}

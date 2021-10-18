import { BeginFreeTrialCommandFactory } from "../commands/BeginFreeTrialCommand";
import { SendQueuedMessageCommandFactory } from "../commands/SendQueuedMessageCommand";
import { ClientOrganization } from "../models/clientOrganizations/ClientOrganization";
import { FirebaseAccountingRepository } from "../models/firebase/FirebaseAccountingRepository";
import { FirebaseClientOrganizationRepository } from "../models/firebase/FirebaseClientOrganizationRepository";
import { FirebaseFreeTrialPhoneNumberRepository } from "../models/firebase/FirebaseFreeTrialPhoneNumberRepository";
import { FirebaseOutgoingMessageQueue } from "../models/firebase/FirebaseOutgoingMessageQueue";
import { FirebaseSlackTeamRepository } from "../models/firebase/FirebaseSlackTeamRepository";
import { CeceInteraction } from "../models/slack/CeceInteraction";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";
import { IQueuedBroadcast } from "../models/textMessages/IQueuedBroadcast";
import { Application } from "./Application";

export class AppFactory {
  static async createAppForSlackInteraction(interaction: CeceInteraction): Promise<Application> {
    const slackTeamRepo = new FirebaseSlackTeamRepository();
    const phoneRepo = new FirebaseFreeTrialPhoneNumberRepository();

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
    const messageQueue = new FirebaseOutgoingMessageQueue(team.client.id);
    const clientRepo = new FirebaseClientOrganizationRepository();
    const accountingRepo = new FirebaseAccountingRepository(team.client.id);

    const freeTrialCommand = BeginFreeTrialCommandFactory(userId, team.client.id, slack, phoneRepo);
    const sendQueuedMessageCommand = SendQueuedMessageCommandFactory(
      slack,
      userId,
      team.client.id,
      interaction.broadcastId,
      messageQueue,
      clientRepo,
      accountingRepo,
      (client: ClientOrganization) => {
        console.log("THIS IS A FAKE WARNING MESSAGE");
        return Promise.resolve();
      },
      (broadcast: IQueuedBroadcast) => {
        console.log("THIS IS WHERE TWILIO WOULD SEND THE MESSAGE");
        return Promise.resolve(true);
      },
      () => {
        console.log("THIS IS WHERE I WOULD UPDATE THE CACHED BALANCE ON THE CLIENT");
        return Promise.resolve();
      },
    );
    return new Application(freeTrialCommand, sendQueuedMessageCommand);
  }
}

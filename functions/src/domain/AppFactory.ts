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
import * as twilio from "twilio";

function makeTwilioClient(config: any): twilio.Twilio {
  if (!config || !config.twilio || !config.twilio.account_sid || !config.twilio.auth_token)
    throw new Error("Twilio not configured");

  const { account_sid: accountSid, auth_token: authToken } = config.twilio;
  return twilio(accountSid, authToken);
}
export class AppFactory {
  static async createAppForSlackInteraction(interaction: CeceInteraction, config: object): Promise<Application> {
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
    const twilioClient = makeTwilioClient(config);
    const client = await clientRepo.find(team.client.id);

    if (!client) throw new Error("Client could not be loaded for interaction");

    const sendTextMessage = async (broadcast: IQueuedBroadcast) => {
      if (broadcast.totalSegments > 14400) throw new Error("Volume exceeds Twilio queue length");
      //https://support.twilio.com/hc/en-us/articles/115002943027-Understanding-Twilio-Rate-Limits-and-Message-Queues

      const sendPromises = broadcast.recipients.map((r) => {
        const message: { body: string; to: string; from: string } = {
          body: broadcast.message,
          to: r.phoneNumber,
          from: client.cecePhoneNumber,
        };

        return twilioClient.api.messages.create(message);
      });

      const sendResults = await Promise.all(sendPromises);
      const messages = sendResults.map((r) => r.sid); // save sms ids for status followup
      return !!messages || true; // hack for now
    };

    const freeTrialCommand = BeginFreeTrialCommandFactory(userId, team.client.id, slack, phoneRepo, clientRepo);

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
      sendTextMessage,
      () => {
        console.log("THIS IS WHERE I WOULD UPDATE THE CACHED BALANCE ON THE CLIENT");
        return Promise.resolve();
      },
    );
    return new Application(freeTrialCommand, sendQueuedMessageCommand);
  }
}

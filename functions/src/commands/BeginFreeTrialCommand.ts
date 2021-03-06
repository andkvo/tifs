import { ICommand } from "../domain/ICommand";
import { IClientOrganizationRepository } from "../models/clientOrganizations/IClientOrganizationRepository";
import { FirebaseFreeTrialPhoneNumberRepository } from "../models/firebase/FirebaseFreeTrialPhoneNumberRepository";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";

export function BeginFreeTrialCommandFactory(
  slackUserId: string,
  clientId: string,
  slack: SlackWorkspaceSdk,
  phoneRepo: FirebaseFreeTrialPhoneNumberRepository,
  clientRepo: IClientOrganizationRepository,
): ICommand<void> {
  return async function BeginFreeTrialCommand() {
    // todoamk: check client record to make sure they haven't had a free trial yet

    const conv = await slack.openConversation(slackUserId);
    try {
      const phoneRecord = await phoneRepo.reserveFreeTrialNumber(clientId);
      const client = await clientRepo.find(clientId);

      if (!client) throw new Error("Client could not be found");

      client.cecePhoneNumber = phoneRecord.phoneNumber;
      client.cecePhoneNumberTwilioSid = phoneRecord.phoneNumberSid;
      await clientRepo.save(client);

      slack.postMessage(conv.channel.id, (message) => {
        message.text = "Your free trial has started and ends soon. Start texting now!";
        message.blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Great! I have set up ${phoneRecord.phoneNumber} for you to use temporarily. I'll have to recycle it in one hour, but you can choose a new number by signing up for a paid plan`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Let's set up your text distribution list. Type `/subscribe INSERT-YOUR-PHONE-NUMBER-HERE` to add your first subscriber.",
            },
          },
        ];
      });
      return Promise.resolve();
    } catch (err) {
      slack.postMessage(
        conv.channel.id,
        "There was an unexpected error. Please contact help@textitfromslack.com to set up your free trial.",
      );
      throw err;
    }
  };
}

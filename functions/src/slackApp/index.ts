import axios from "axios";
import { Message } from "firebase-functions/v1/pubsub";
import pubSubHandlerFactory from "../common/pubSubHandlerFactory";
import { FirebaseFreeTrialPhoneNumberRepository } from "../models/firebase/FirebaseFreeTrialPhoneNumberRepository";
import { IPubSub } from "../models/pubsub/IPubSub";
import { ISlackTeamRepository } from "../models/slack/ISlackTeamRepository";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";
import { IClientSmsSubscriberRepository } from "../models/subscribers/IClientSmsSubscriberRepository";

export default function (
  functions: any,
  slackTeamRepo: ISlackTeamRepository,
  textSubscriberRepositoryFactory: (clientId: string) => IClientSmsSubscriberRepository,
  pubsub: IPubSub,
) {
  const handlePubSubTopic = pubSubHandlerFactory(functions);

  const config = functions.config();

  const slackInstallationExpressApp = require("./routes")(config);

  const slackAppInstallation = functions.https.onRequest(slackInstallationExpressApp);

  const beginFreeTrialSlack = handlePubSubTopic("begin-free-trial-slack", async (message: Message, context: any) => {
    console.log("Message", message);
    console.log("Context", context);
    console.log("decoded message", message.json);
    const phoneNumbers = await new FirebaseFreeTrialPhoneNumberRepository().getAll();
    console.log("phone numbers", phoneNumbers);
  });

  const addSmsSubscriber = handlePubSubTopic("add-sms-subscriber", async (message: Message, context: any) => {
    console.log("Message", message);
    console.log("Context", context);
    console.log("decoded message", message.json);

    const { team_id: teamId, text: commandText, response_url: responseUrl } = message.json;

    console.log("important stuff", { teamId, commandText, responseUrl });

    try {
      const [phoneNumberInput, firstName, lastName] = commandText.split(/\s+/);
      const phoneNumber = phoneNumberInput.replace(/[^0-9]/g, "");

      if (!phoneNumberInput || !/^[0-9]{10}$/.test(phoneNumber)) {
        axios.post(responseUrl, {
          replace_original: "true",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Sorry, I couldn't understand that input. Make sure you're doing one of the following formats:",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "```/subscribe XXX-XXX-XXXX```",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "```/subscribe XXX-XXX-XXXX firstname```",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "```/subscribe XXX-XXX-XXXX firstname lastname```",
              },
            },
          ],
        });
        return;
      }

      const slackTeam = await slackTeamRepo.get(teamId);
      const clientId = slackTeam?.client?.id;

      if (!clientId) throw new Error("Could not determine client for this Slack team");

      const subscriberRepo = textSubscriberRepositoryFactory(clientId);
      await subscriberRepo.create({ phoneNumber: "+1" + phoneNumber, firstName, lastName });
      const subscriberCount = (await subscriberRepo.find()).length;

      let responseText = `OK! I've added ${phoneNumber} as a subscriber!`;

      if (subscriberCount > 1) {
        responseText += " To see a list of your subscribers, type `/subscribers`.";
      } else {
        await pubsub.triggerMessage("first-subscriber-added", message.json);
      }

      axios.post(responseUrl, {
        replace_original: "true",
        text: responseText,
      });
    } catch (err) {
      console.error("An unexpected error occurred when adding a subscriber.", { err });
      axios.post(responseUrl, {
        replace_original: "true",
        text: `Oh no! I've encountered an unexpected problem. Please contact support@textitfromslack.com.`,
      });
      throw err;
    }
  });

  const firstSubscriber = handlePubSubTopic("first-subscriber-added", async (message: Message, context: any) => {
    console.debug("Message", message);
    console.debug("Context", context);
    console.debug("decoded message", message.json);

    const { team_id: teamId, text: commandText, response_url: responseUrl } = message.json;

    console.debug("important stuff", { teamId, commandText, responseUrl });

    const team = await slackTeamRepo.get(teamId);

    if (!team) throw new Error("Team could not be located from message data");

    const slack = new SlackWorkspaceSdk(team.accessToken);
    const conv = await slack.openConversation(team.authedUserId);

    const firstSubscriberMessage = await slack.postMessage(
      conv.channel.id,

      (message) => {
        message.text = ":tada: You added your first subscriber! Let's keep going!"; // fallback for notifications

        message.blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":tada: You've added your first subscriber. (Hopefully it's your own number). Now let's send a text.",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Type `/broadcast blah blah blah this is a text message blah` to send your message",
            },
          },
        ];
      },
    );

    console.debug("Finished handling first subscriber", firstSubscriberMessage);
  });

  return { slackAppInstallation, beginFreeTrialSlack, addSmsSubscriber, firstSubscriber };
}

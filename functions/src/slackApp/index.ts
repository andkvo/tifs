import axios from "axios";
import { Message } from "firebase-functions/v1/pubsub";
import pubSubHandlerFactory from "../common/pubSubHandlerFactory";
import { FirebaseFreeTrialPhoneNumberRepository } from "../models/firebase/FirebaseFreeTrialPhoneNumberRepository";
import { ISlackTeamRepository } from "../models/slack/ISlackTeamRepository";
import { IClientSmsSubscriberRepository } from "../models/subscribers/IClientSmsSubscriberRepository";

export default function (
  functions: any,
  slackTeamRepo: ISlackTeamRepository,
  textSubscriberRepositryFactory: (clientId: string) => IClientSmsSubscriberRepository,
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

      const subscriberRepo = textSubscriberRepositryFactory(clientId);
      await subscriberRepo.create({ phoneNumber: "+1" + phoneNumber, firstName, lastName });

      axios.post(responseUrl, {
        replace_original: "true",
        text: `OK! I've added ${phoneNumber} as a subscriber!`,
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

  return { slackAppInstallation, beginFreeTrialSlack, addSmsSubscriber };
}

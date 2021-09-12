import { Message } from "firebase-functions/v1/pubsub";
import pubSubHandlerFactory from "../common/pubSubHandlerFactory";
import { FirebaseFreeTrialPhoneNumberRepository } from "../models/firebase/FirebaseFreeTrialPhoneNumberRepository";

module.exports = function (functions: any) {
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

  return { slackAppInstallation, beginFreeTrialSlack };
};

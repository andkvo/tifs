// import pubSubHandlerFactory from "../common/pubSubHandlerFactory";

module.exports = function (functions: any) {
  // const handlePubSubTopic = pubSubHandlerFactory(functions);

  const config = functions.config();

  const slackInstallationExpressApp = require("./routes")(config);

  const slackAppInstallation = functions.https.onRequest(slackInstallationExpressApp);

  return { slackAppInstallation };
};

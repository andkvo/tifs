// import pubSubHandlerFactory from "../common/pubSubHandlerFactory";

module.exports = function (functions: any) {
  // const handlePubSubTopic = pubSubHandlerFactory(functions);

  const slackInstallationExpressApp = require("./routes")();

  const slackAppInstallation = functions.https.onRequest(slackInstallationExpressApp);

  return { slackAppInstallation };
};

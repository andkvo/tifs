import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { provisionOfficeHttpController, provisionOfficePubSubMessageHandler } from "./provisionOffice";
import { smsWebhookHttpController, incomingSmsPubSubMessageHandler } from "./smsIncomingWebhook";
import {
  slackWebhooksHttpController,
  slackEventPubSubMessageHandler,
  slackInteractionPubSubMessageHandler,
  slackSlashPubSubMessageHandler,
} from "./slackController";
import firebaseInfo from "./firebaseInfo";
import { dailyTickPubSubMessageHandler } from "./cron";
import { manageClientsHttpController } from "./manageClients";
import {
  recordInboundSmsBillingPubSubMessageHandler,
  recordOutboundSmsBillingPubSubMessageHandler,
  fundsAddedBillingPubSubHandler,
} from "./billing";
import { suspendClientAccountPubSubMessageHandler } from "./suspendClientAccount";
import { reinstateClientAccountPubSubMessageHandler } from "./reinstateClientAccount";
import pubSubHandlerFactory from "./common/pubSubHandlerFactory";
import slackApp from "./slackApp";
import { FirebaseClientSmsSubscriberRepository } from "./models/firebase/FirebaseSmsSubscriberRepository";
import { FirebaseSlackTeamRepository } from "./models/firebase/FirebaseSlackTeamRepository";
import { FirebasePubSub } from "./models/firebase/FirebasePubSub";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

admin.initializeApp();

// something the logs told me to add /shrug
const settings = { timestampsInSnapshots: true, ignoreUndefinedProperties: true };
admin.firestore().settings(settings);

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

const handlePubSubTopic = pubSubHandlerFactory(functions);

// WEBHOOKS

export const provisionOffice = functions.https.onRequest(provisionOfficeHttpController);

export const sms = functions.https.onRequest(smsWebhookHttpController);

export const slack = functions.https.onRequest(slackWebhooksHttpController);

export const firebaseInfoEndpoint = functions.https.onRequest(firebaseInfo);

export const manageClients = functions.https.onRequest(manageClientsHttpController);

// PUBSUB

export const incomingSmsMessageHandler = handlePubSubTopic("incoming-sms", incomingSmsPubSubMessageHandler);

export const slackEventHandler = handlePubSubTopic("slack-event", slackEventPubSubMessageHandler);

export const slackInteractionHandler = handlePubSubTopic("slack-interaction", slackInteractionPubSubMessageHandler);

export const slackSlashHandler = handlePubSubTopic("slack-slash", slackSlashPubSubMessageHandler);

export const provisionOfficeHandler = handlePubSubTopic("provision-office", provisionOfficePubSubMessageHandler);

export const dailyTickHandler = handlePubSubTopic("daily-tick", dailyTickPubSubMessageHandler);

export const smsBillingHandler = handlePubSubTopic(
  "accounting-record-inbound-sms",
  recordInboundSmsBillingPubSubMessageHandler,
);

export const smsOutgoingBillingHandler = handlePubSubTopic(
  "accounting-record-outbound-sms",
  recordOutboundSmsBillingPubSubMessageHandler,
);

export const suspendClientAccountHandler = handlePubSubTopic(
  "suspend-account",
  suspendClientAccountPubSubMessageHandler,
);

export const reinstateClientAccountHandler = handlePubSubTopic(
  "reinstate-account",
  reinstateClientAccountPubSubMessageHandler,
);

export const fundsAddedHandler = handlePubSubTopic("funds-added", fundsAddedBillingPubSubHandler);

export const { slackAppInstallation, beginFreeTrialSlack, addSmsSubscriber, firstSubscriber } = slackApp(
  functions,
  new FirebaseSlackTeamRepository(),
  (clientId) => new FirebaseClientSmsSubscriberRepository(clientId),
  new FirebasePubSub(),
);

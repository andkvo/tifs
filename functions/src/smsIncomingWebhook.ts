import * as express from "express";
import { aaCors, logWithTimestampIfAboveThreshold, LogLevel } from "./firebase-utils";
import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import { postMessageInSlack } from "./util/slack";
import { ITextMessageRepository } from "./models/textMessages/ITextMessageRepository";
import { FirebaseTextMessageRepository } from "./models/firebase/FirebaseTextMessageRepository";
import { TextMessage, TwilioTextMessage } from "./models/textMessages/TextMessage";
import { ClientOrganization } from "./models/clientOrganizations/ClientOrganization";
import { IIdentity } from "./models/common/IIdentity";
import { IPubSub } from "./models/pubsub/IPubSub";
import { FirebasePubSub } from "./models/firebase/FirebasePubSub";
import { PubSub } from "@google-cloud/pubsub";

const app = express();

const logWithTimestamp = (messageLevel: LogLevel, message: string, inspect?: any) => {
  logWithTimestampIfAboveThreshold(LogLevel.Debug, messageLevel, message, inspect);
};

app.use(aaCors);
app.use(express.json());

async function determineSlackDestination(sms: any): Promise<(ClientOrganization & IIdentity) | null> {
  logWithTimestamp(LogLevel.Info, "Locating org preferences for Slack destination...");

  const clientRepo = <IClientOrganizationRepository>new FirebaseClientOrganizationRepository();

  const orgPrefs = await clientRepo.lookupByClientMobilePhoneNumber(sms.From);

  if (orgPrefs) {
    logWithTimestamp(LogLevel.Debug, "Found organization preferences", orgPrefs);

    return Promise.resolve(orgPrefs);
  }

  return Promise.resolve(null);
}

async function determineSlackDestinationForIncomingSms(sms: any): Promise<(ClientOrganization & IIdentity) | null> {
  logWithTimestamp(LogLevel.Info, "Locating org preferences for Slack destination...");

  const clientRepo = <IClientOrganizationRepository>new FirebaseClientOrganizationRepository();

  const orgPrefs = await clientRepo.lookupByOfficePhoneNumber(sms.To);

  if (orgPrefs) {
    logWithTimestamp(LogLevel.Debug, "Found organization preferences", orgPrefs);

    return Promise.resolve(orgPrefs);
  }

  return Promise.resolve(null);
}

app.post("/incoming", async (req: express.Request, res: express.Response) => {
  //TODO: validating that this came from twilio somehow?

  // match the destination number to a client
  // is this origin number allowed to text?
  // if not, send to the reject channel
  // if so, continue...

  // Creates a client
  const pubsub = new PubSub();
  const dataBuffer = Buffer.from(JSON.stringify(req.body));

  pubsub
    .topic("incoming-sms")
    .publish(dataBuffer)
    .then((messageId: any) => {
      logWithTimestamp(LogLevel.Info, `Published message ${messageId}`);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end();
    })
    .catch((err: any) => logWithTimestamp(LogLevel.Error, err));
});

export const smsWebhookHttpController = app;

function mapMessageToRecord(sms: TwilioTextMessage, clientId: string): TextMessage {
  return { ...sms, timestamp: new Date(Date.now()), clientId: clientId };
}

export const incomingSmsPubSubMessageHandler = async (message: any, ctx: any) => {
  logWithTimestamp(LogLevel.Info, "Handling IncomingSmsMessage from pubsub...");
  logWithTimestamp(LogLevel.Debug, "Received IncomingSmsMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message with context", ctx);
  const messageBody: TwilioTextMessage = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded message", messageBody);

  const orgPrefs = await determineSlackDestinationForIncomingSms(messageBody);
  if (!orgPrefs) throw new Error("Org prefs not found");

  const repo: ITextMessageRepository = new FirebaseTextMessageRepository();

  const textMessage = await repo
    .saveNew(mapMessageToRecord(messageBody, orgPrefs.id))
    .then((record) => {
      logWithTimestamp(LogLevel.Info, "Message saved to database...");
      return record;
    })
    .catch((err) => logWithTimestamp(LogLevel.Error, err));

  console.log(textMessage); // not unused now is it sucka

  if (orgPrefs) {
    await postMessageInSlack(orgPrefs.slackChannelId, messageBody.Body); //.catch(err => logWithTimestamp(LogLevel.Error, err));
  } else {
    logWithTimestamp(
      LogLevel.Info,
      "Could not locate organization preferences for this SMS sender. Discarding message.",
    );
  }
};

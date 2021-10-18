import * as express from "express";
import { aaCors, LogLevel, curryLogWithTimestamp } from "./firebase-utils";
// import * as twilio from "twilio";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as Slack from "./models/slack/CeceInteraction";
// import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
// import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import { IPubSub } from "./models/pubsub/IPubSub";
import { FirebasePubSub } from "./models/firebase/FirebasePubSub";
// import { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";
// import { ClientOrganization } from "./models/clientOrganizations/ClientOrganization";
import { IIdentity } from "./models/common/IIdentity";
// import { ITextMessageRepository } from "./models/textMessages/ITextMessageRepository";
// import { FirebaseTextMessageRepository } from "./models/firebase/FirebaseTextMessageRepository";
import { OutgoingTextMessage } from "./models/textMessages/TextMessage";
import { PubSub } from "@google-cloud/pubsub";
import { AppFactory } from "./domain/AppFactory";
import { MiddlewareFactory as VerifySlackRequestFactory } from "./middleware/VerifySlackRequest";

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

const app = express();

app.use(aaCors);
app.use(express.json());

function shouldIgnoreSlackMessage(evt: any) {
  return !!evt.subtype;
}

// function sendMessageAsText(msgData: {
//   message: string;
//   orgPrefs: (ClientOrganization & IIdentity) | null;
// }): Promise<any> {
//   logWithTimestamp(LogLevel.Info, "Sending text message...");

//   if (!msgData.orgPrefs) throw new Error("must include org prefs");

//   const config = {
//     accountSid: functions.config().twilio.account_sid,
//     authToken: functions.config().twilio.auth_token,
//   };

//   const client = twilio(config.accountSid, config.authToken);

//   return client.api.messages
//     .create({
//       body: msgData.message,
//       to: "",
//       from: msgData.orgPrefs.cecePhoneNumber,
//     })
//     .then((msg) => {
//       logWithTimestamp(LogLevel.Info, "Text message sent.");
//       logWithTimestamp(LogLevel.Debug, "Message sent as SMS", msg);

//       const orgPrefs = msgData.orgPrefs;

//       if (!orgPrefs) throw new Error("must include org prefs");

//       return {
//         ...msg,
//         clientId: orgPrefs.id,
//         timestamp: new Date(Date.now()),
//       };
//     });
// }

function logInteractionToDatabase(payload: any): Promise<void> {
  logWithTimestamp(LogLevel.Info, "Saving interaction to database...");
  logWithTimestamp(LogLevel.Debug, "Object to save:", payload);

  return admin
    .firestore()
    .collection("slackInteractions")
    .add(payload)
    .then(() => {
      logWithTimestamp(LogLevel.Info, "Interaction saved to database...");
    });
}

app.post("/interactives-webhook", async (req: express.Request, res: express.Response) => {
  logWithTimestamp(LogLevel.Info, "Incoming Slack Interaction...");
  logWithTimestamp(LogLevel.Debug, "Slack interactives payload", req.body.payload);

  const pubsub = new PubSub();
  const dataBuffer = Buffer.from(req.body.payload);

  pubsub
    .topic("slack-interaction")
    .publish(dataBuffer)
    .then((messageId: any) => {
      logWithTimestamp(LogLevel.Info, `SlackInteractionMessage ${messageId} published.`);
      res.writeHead(200, { "Content-Type": "application/json" }); // respond to Slack quickly so they know it's working
      res.end(JSON.stringify({}));
    })
    .catch((err: any) => {
      logWithTimestamp(LogLevel.Error, err);
      res.sendStatus(500);
      res.end();
    });
});

app.post("/events-webhook", async (req: express.Request, res: express.Response) => {
  logWithTimestamp(LogLevel.Info, "Incoming Slack Event...");

  if (req.body.token !== functions.config().slack.verification_token) {
    logWithTimestamp(LogLevel.Error, "Unauthorized access.");
    res.sendStatus(403);
    res.end();
    return;
  }

  if (req.body.type === "url_verification") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(req.body.challenge);
    return;
  }

  logWithTimestamp(LogLevel.Debug, "Received a request from Slack", req.body);

  if (req.body.type === "event_callback") {
    logWithTimestamp(LogLevel.Info, "This request from Slack appears to be an event");

    if (req.body.event.type === "message") {
      logWithTimestamp(LogLevel.Info, "This event from Slack appear to concern a message");

      if (shouldIgnoreSlackMessage(req.body.event)) {
        logWithTimestamp(
          LogLevel.Info,
          "Actually, this event from Slack is not something we care about. We're done here.",
        );
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end();
        return;
      }

      logWithTimestamp(LogLevel.Info, "Whoa-ho! This is a message from a user! We have to deal with this.");

      const pubsub: IPubSub = new FirebasePubSub();

      pubsub
        .triggerMessage("slack-event", req.body)
        .then((m) => {
          logWithTimestamp(LogLevel.Info, `Message ${m.messageId} published.`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end();
        })
        .catch((err) => {
          console.error("ERROR:", err);
          res.sendStatus(500);
          res.end();
        });
    }
  }
});

app.post(
  "/slash-commands",
  VerifySlackRequestFactory(functions.config().slack.signing_secret, () => new Date().valueOf()),
  async (req: express.Request, res: express.Response) => {
    logWithTimestamp(LogLevel.Debug, "Received request", req.body);

    const payload = req.body;

    if (payload.token !== functions.config().slack.verification_token) {
      return res.sendStatus(403);
    }

    const pubsub: IPubSub = new FirebasePubSub();

    switch (payload.command) {
      case "/subscribe":
        console.log("Triggering message add-sms-subscriber");
        await pubsub.triggerMessage("add-sms-subscriber", payload);
        return res.send("Adding subscriber...");
      case "/broadcast":
        console.log("Triggering message broadcast-sms-from-slack");
        await pubsub.triggerMessage("broadcast-sms-from-slack", payload);
        return res.send("Preparing message...");
      default:
        break;
    }

    return res.sendStatus(200);
  },
);

export const slackSlashPubSubMessageHandler = async (message: any, ctx: any) => {
  logWithTimestamp(LogLevel.Debug, "Received SlackSlashMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", ctx);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded SlackSlashMessage", payload);
};

function saveMessageToDatabase(eventWebhookRequest: any): Promise<any> {
  logWithTimestamp(LogLevel.Info, "Saving message to database...");

  const db = admin.firestore();
  return db
    .collection("incomingSlackMessages")
    .add(eventWebhookRequest)
    .then(() => {
      logWithTimestamp(LogLevel.Info, "Message saved to database...");
      return eventWebhookRequest.event;
    });
}

// function determineSmsDestination(
//   eventData: any,
// ): Promise<{ message: string; orgPrefs: (ClientOrganization & IIdentity) | null }> {
//   logWithTimestamp(LogLevel.Info, "Looking up organization preferences...");
//   const slackChannelId = eventData.channel;
//   const clientRepo = <IClientOrganizationRepository>new FirebaseClientOrganizationRepository();

//   return clientRepo.lookupBySlackChannelId(slackChannelId).then((orgPrefs) => {
//     return {
//       message: eventData.text,
//       orgPrefs: orgPrefs,
//     };
//   });
// }

export const slackWebhooksHttpController = app;

async function wasMessageAlreadyHandled(eventId: string) {
  const lockId = await saveLockToDatabase(eventId);
  const earliestLockId = await findEarliestLock(eventId);

  return earliestLockId !== lockId;
}

function saveLockToDatabase(eventId: string): Promise<string> {
  return admin
    .firestore()
    .collection("slackEventLocks")
    .add({ eventId: eventId, timestamp: Date.now() })
    .then((doc) => {
      logWithTimestamp(LogLevel.Info, "Lock record saved.");
      return doc.id;
    });
}

function findEarliestLock(eventId: string): Promise<string | null> {
  return admin
    .firestore()
    .collection("slackEventLocks")
    .where("eventId", "==", eventId)
    .orderBy("timestamp")
    .limit(1)
    .get()
    .then((qs) => {
      let earliestLockId;

      qs.forEach((doc) => {
        earliestLockId = doc.id;
      });

      if (earliestLockId) {
        logWithTimestamp(LogLevel.Info, "Earliest lock located: ", earliestLockId);
      }

      return earliestLockId || null;
    });
}

// function mapTwilioOutgoingSmsToOutgoingTextMessage(
//   twilioSms: { clientId: string; timestamp: Date } & MessageInstance,
// ): OutgoingTextMessage {
//   return {
//     accountSid: twilioSms.accountSid,
//     apiVersion: twilioSms.apiVersion,
//     body: twilioSms.body,
//     dateCreated: twilioSms.dateCreated,
//     dateSent: twilioSms.dateSent,
//     dateUpdated: twilioSms.dateUpdated,
//     direction: twilioSms.direction,
//     errorCode: twilioSms.errorCode,
//     errorMessage: twilioSms.errorMessage,
//     from: twilioSms.from,
//     messagingServiceSid: twilioSms.messagingServiceSid,
//     numMedia: twilioSms.numMedia,
//     numSegments: twilioSms.numSegments,
//     price: parseFloat(twilioSms.price),
//     priceUnit: twilioSms.priceUnit,
//     sid: twilioSms.sid,
//     status: twilioSms.status,
//     to: twilioSms.to,
//     clientId: twilioSms.clientId,
//     timestamp: twilioSms.timestamp,
//   };
// }

// async function saveSmsToDatabase(
//   message: { clientId: string; timestamp: Date } & MessageInstance,
// ): Promise<OutgoingTextMessage & IIdentity> {
//   const repo: ITextMessageRepository = new FirebaseTextMessageRepository();

//   return repo.saveNewOutgoing(mapTwilioOutgoingSmsToOutgoingTextMessage(message)).then((record) => {
//     logWithTimestamp(LogLevel.Info, "Message saved to database...");
//     return record;
//   });
// }

const recordSmsForBilling = async (msg: OutgoingTextMessage & IIdentity) => {
  const pubsub: IPubSub = new FirebasePubSub();

  return pubsub
    .triggerMessage("accounting-record-outbound-sms", msg)
    .catch((err) => logWithTimestamp(LogLevel.Error, err));
};

export const slackEventPubSubMessageHandler = async (message: any, ctx: any) => {
  logWithTimestamp(LogLevel.Info, "Handling SlackEventMessage from pubsub...");
  logWithTimestamp(LogLevel.Debug, "Received SlackEventMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message with context", ctx);
  const messageBody = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded message", messageBody);

  // todoamk: if(!await doesMessageConcernUs(messageBody)) return;

  if (await wasMessageAlreadyHandled(messageBody.event_id)) {
    logWithTimestamp(LogLevel.Info, "It looks like this slack event was already handled");
    return;
  }

  try {
    const eventData = await saveMessageToDatabase(messageBody);
    // const eventData2 = await determineSmsDestination(eventData);
    //const eventData3 = await sendMessageAsText(eventData2);
    // const eventData4 = await saveSmsToDatabase(eventData3);
    await recordSmsForBilling(eventData);
  } catch (err) {
    logWithTimestamp(LogLevel.Error, "Error sending message as SMS - " + err);
    return;
  }
};

export const slackInteractionPubSubMessageHandler: (message: any, ctx: any) => Promise<void> = async (
  message: any,
  ctx: any,
) => {
  logWithTimestamp(LogLevel.Debug, "Received SlackInteractionMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", ctx);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded SlackInteractionMessage", payload);

  try {
    logInteractionToDatabase(payload).catch((err) => {
      logWithTimestamp(LogLevel.Error, err);
    });

    const interaction = new Slack.CeceInteraction(payload);
    logWithTimestamp(LogLevel.Debug, "Created interaction object", interaction);
    const app = await AppFactory.createAppForSlackInteraction(interaction);

    switch (interaction.type) {
      case Slack.InteractionType.ACCEPT_TOS:
        return await app.beginFreeTrial();
      case Slack.InteractionType.SEND_QUEUED_MESSAGE:
        return await app.sendQueuedMessage().then(() => console.log("Done sending queued message"));
      default:
        logWithTimestamp(LogLevel.Warn, "Unhandled interation", interaction);
        return;
    }
  } catch (err: any) {
    logWithTimestamp(LogLevel.Error, err);
  }
};

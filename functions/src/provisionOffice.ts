import * as express from "express";
import { aaCors, logWithTimestampIfAboveThreshold, LogLevel, createLoggingMiddleware } from "./firebase-utils";
import * as functions from "firebase-functions";
import * as twilio from "twilio";
import { ClientOrganization } from "./models/clientOrganizations/ClientOrganization";
import { IIdentity } from "./models/common/IIdentity";
import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import Twilio = require("twilio/lib/rest/Twilio");
import { FirebaseApplicationPreferencesRepository } from "./models/firebase/FirebaseApplicationPreferencesRepository";
import { postMessageInSlack } from "./util/slack";
import { ClientOrganizationRepository } from "./models/clientOrganizations/ClientOrganizationRepository";
import { FormatsPhoneNumbers } from "./models/common/FormatsPhoneNumbers";
import { FirebasePubSub } from "./models/firebase/FirebasePubSub";
import { IPubSub } from "./models/pubsub/IPubSub";
import { IApplicationPreferencesRepository } from "./models/application/IApplicationPreferencesRepository";
import axios from "axios";

const logWithTimestamp = (messageLevel: LogLevel, message: string, inspect?: any) => {
  logWithTimestampIfAboveThreshold(LogLevel.Debug, messageLevel, message, inspect);
};

const app = express();

app.use(aaCors);

app.use(createLoggingMiddleware((message: string, obj: any) => logWithTimestamp(LogLevel.Debug, message, obj)));

app.post("/create", async (req, res) => {
  const jsonBody = req.body;
  logWithTimestamp(LogLevel.Debug, "Received request", jsonBody);

  if (
    !jsonBody.organizationName ||
    !jsonBody.greetingStyle ||
    !jsonBody.clientMobileNumber ||
    !jsonBody.requestedAreaCode
  ) {
    throw new Error("Request did not include required parameters");
  }

  const clientRepo = <IClientOrganizationRepository>(
    new ClientOrganizationRepository(new FirebaseClientOrganizationRepository(), new FormatsPhoneNumbers())
  );

  clientRepo
    .create({
      organizationName: jsonBody.organizationName,
      cecePhoneNumber: "",
      cecePhoneNumberTwilioSid: "",
      slackChannelId: "",
      requestedAreaCode: jsonBody.requestedAreaCode,
      primaryContactName: jsonBody.primaryContactName,
      isAccountSuspended: false,
      minimumBalanceRequiredInTenths: 5000,
      warningBalanceInTenths: 7000,
      wasWarnedAboutBalance: false,
      stripeCustomerId: "",
      smsCostInTenths: 30000,
    })
    .then((orgPrefs) => {
      logWithTimestamp(LogLevel.Info, "Publishing ProvisionOfficeMessage...");
      const pubsub = <IPubSub>new FirebasePubSub();
      pubsub
        .triggerMessage("provision-office", orgPrefs)
        .then((m) => logWithTimestamp(LogLevel.Info, "Published ProvisionOfficeMessage."))
        .catch((err) => logWithTimestamp(LogLevel.Error, err));
    })
    .then((p) => {
      console.log("made it to send http response");
      res.sendStatus(200);
      res.end({ errors: [] });
    })
    .catch((reason) => {
      res.sendStatus(500);
      res.end({ errors: ["ERROR: " + reason] });
    });
});

app.get("/approve", async (req, res) => {
  const clientId = (req.query.clientId || "") as string;

  if (!clientId) throw new Error("A client ID is required for this endpoint");

  const clientRepo = <IClientOrganizationRepository>(
    new ClientOrganizationRepository(new FirebaseClientOrganizationRepository(), new FormatsPhoneNumbers())
  );
  const orgPrefs = await clientRepo.find(clientId);

  if (!orgPrefs) throw new Error("Org prefs not found");

  clientRepo.save(orgPrefs).catch((err) => logWithTimestamp(LogLevel.Error, err));

  let responseString = `Client ID: ${clientId}\n`;

  if (orgPrefs) {
    const pubsub: IPubSub = new FirebasePubSub();

    pubsub
      .triggerMessage("provision-office", orgPrefs)
      .then((m) => logWithTimestamp(LogLevel.Info, "Published ProvisionOfficeMessage."))
      .catch((err) => logWithTimestamp(LogLevel.Error, err));

    responseString += "Client found; message kicked off.";
  } else {
    responseString += "Client not found";
  }

  res.end(responseString);
});

app.get("/suspend", async (req, res) => {
  const clientId = (req.query.clientId || "") as string;

  if (!clientId) throw new Error("A client ID is required for this endpoint");

  const clientRepo = <IClientOrganizationRepository>(
    new ClientOrganizationRepository(new FirebaseClientOrganizationRepository(), new FormatsPhoneNumbers())
  );
  const orgPrefs = await clientRepo.find(clientId);

  if (orgPrefs) {
    logWithTimestamp(LogLevel.Debug, "Organization found", orgPrefs);

    orgPrefs.isAccountSuspended = true;
    await clientRepo.save(orgPrefs);

    const accountSid = "AC1be9670975eadadd8cc3cbb9fe5378fc";
    const authToken = functions.config().twilio.auth_token;
    const twilioClient = twilio(accountSid, authToken);

    try {
      await twilioClient.incomingPhoneNumbers(orgPrefs.cecePhoneNumberTwilioSid).update({
        smsApplicationSid: "",
        smsUrl: "",
        smsMethod: "",
        voiceApplicationSid: "",
        voiceUrl: "",
        voiceMethod: "",
      });
    } catch (err: any) {
      logWithTimestamp(LogLevel.Error, err);
      res.sendStatus(500);
      res.end("ERROR: Could not suspend phone number.");
      return;
    }
  }

  let responseString = `Client ID: ${clientId}\n`;

  if (orgPrefs) {
    responseString += "Client found; account suspended.";
  } else {
    responseString += "Client not found";
  }

  res.end(responseString);
});

app.get("/reactivate", async (req, res) => {
  const clientId = (req.query.clientId || "") as string;

  if (!clientId) throw new Error("A client ID is required for this endpoint");

  const clientRepo = <IClientOrganizationRepository>(
    new ClientOrganizationRepository(new FirebaseClientOrganizationRepository(), new FormatsPhoneNumbers())
  );
  const orgPrefs = await clientRepo.find(clientId);

  if (orgPrefs) {
    orgPrefs.isAccountSuspended = false;
    await clientRepo.save(orgPrefs);

    const appPrefsRepo: IApplicationPreferencesRepository = new FirebaseApplicationPreferencesRepository();
    const appPrefs = await appPrefsRepo.load();

    if (!appPrefs) throw new Error("appPrefs not found");

    const accountSid = "AC1be9670975eadadd8cc3cbb9fe5378fc";
    const authToken = functions.config().twilio.auth_token;
    const twilioClient = twilio(accountSid, authToken);

    try {
      await twilioClient.incomingPhoneNumbers(orgPrefs.cecePhoneNumberTwilioSid).update({
        smsApplicationSid: appPrefs.twimlVoiceAppSid,
        voiceApplicationSid: appPrefs.twimlVoiceAppSid,
      });
    } catch (err: any) {
      logWithTimestamp(LogLevel.Error, err);
      res.sendStatus(500);
      res.end("ERROR: Could not reactivate phone number.");
      return;
    }
  }

  let responseString = `Client ID: ${clientId}\n`;

  if (orgPrefs) {
    responseString += "Client found; account reactivated.";
  } else {
    responseString += "Client not found";
  }

  res.end(responseString);
});

function convertNameToSlackChannelName(name: string): string {
  return name
    .replace(/[\W_]+/g, "-")
    .substr(0, 21)
    .toLowerCase();
}

async function getAllSlackUserIds(): Promise<Array<string>> {
  const response = await axios.get("https://slack.com/api/users.list", {
    headers: {
      authorization: "Bearer " + functions.config().slack.user_token,
    },
  });
  return response.data.members.map((m: any) => m.id);
}

async function addUsersToChannel(userIds: Array<string>, slackChannelId: string) {
  for (const userId of userIds) {
    axios.post(
      "https://slack.com/api/channels.invite",
      {
        channel: slackChannelId,
        user: userId,
      },
      {
        headers: {
          authorization: "Bearer " + functions.config().slack.user_token,
        },
      },
    );
  }
}

async function createSlackChannel(orgPrefs: ClientOrganization & IIdentity): Promise<string> {
  console.log("Now creating Slack channel...");

  const slackChannelName = convertNameToSlackChannelName(orgPrefs.organizationName);

  const slackResponse = await axios.post(
    "https://slack.com/api/channels.create",
    {
      name: slackChannelName,
      validate: true,
    },
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + functions.config().slack.user_token,
      },
    },
  );

  logWithTimestamp(LogLevel.Info, "Slack channel created successfully");
  logWithTimestamp(LogLevel.Debug, "Slack response", slackResponse);

  const slackChannelId = slackResponse.data.channel.id;

  const slackResponse2 = await axios.post(
    "https://slack.com/api/channels.setTopic",
    {
      channel: slackChannelId,
    },
    {
      headers: {
        authorization: "Bearer " + functions.config().slack.user_token,
      },
    },
  );

  logWithTimestamp(LogLevel.Info, "Slack channel topic set successfully");
  logWithTimestamp(LogLevel.Debug, "Slack response", slackResponse2);

  const userIds = await getAllSlackUserIds();
  addUsersToChannel(userIds, slackChannelId).catch((err) => logWithTimestamp(LogLevel.Error, err));

  return slackChannelId;
}

function getIntroductoryMessages(): string[] {
  const messages = [];
  messages[0] = "Hi! Thanks for choosing Cece!";
  messages[1] = "Make sure you add me to your contacts before you forget.";
  messages[2] = 'You can also train your smartphone\'s digital assistant to know me as "my secretary."';
  messages[3] =
    'That way you can say commands to your smartphone like "Text my secretary" and it will send me a message.';
  messages[4] = "If you need any assistance - from the next novel to a grocery list - just send me a quick text.";

  return messages;
}

async function sendIntroductorySms(orgPrefs: any, messages: string[]): Promise<any> {
  logWithTimestamp(LogLevel.Info, "Sending intro messages...");

  const config = {
    accountSid: functions.config().twilio.account_sid,
    authToken: functions.config().twilio.auth_token,
  };

  const client = twilio(config.accountSid, config.authToken);

  const promises = new Array<Promise<void>>();

  for (let i = 0; i < messages.length; i += 1) {
    const message = {
      body: messages[i],
      to: orgPrefs.clientMobileNumber,
      from: orgPrefs.cecePhoneNumber,
    };

    const staggeredTimeout = 1000 + 2000 * i;

    logWithTimestamp(LogLevel.Info, "queueing message " + (i + 1) + " for " + staggeredTimeout / 1000 + " seconds");

    promises.push(sendDelayedSms(client, message, staggeredTimeout));
  }

  return Promise.all(promises);
}

async function sendDelayedSms(
  client: Twilio,
  message: { body: string; to: string; from: string },
  timeout: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      logWithTimestamp(LogLevel.Info, "sending message ", message);

      client.api.messages.create(message).catch((err) => {
        console.log("ERROR: ", err);
        reject(err);
      });

      resolve();
    }, timeout);
    return;
  });
}

async function postIntroductoryMessagesInSlack(
  orgPrefs: ClientOrganization & IIdentity,
  messages: string[],
): Promise<void> {
  for (const message of messages) {
    await postMessageInSlack(orgPrefs.slackChannelId, message);
  }

  return Promise.resolve();
}

export const provisionOfficePubSubMessageHandler = async (message: any, ctx: any) => {
  logWithTimestamp(LogLevel.Info, "Handling ProvisionOfficeMessage from pubsub...");
  logWithTimestamp(LogLevel.Debug, "Received ProvisionOfficeMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message with context", ctx);
  const orgPrefs = <ClientOrganization & IIdentity>message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded message", orgPrefs);

  // Download the Node helper library from twilio.com/docs/node/install
  // These identifiers are your accountSid and authToken from
  // https://www.twilio.com/console
  const accountSid = "AC1be9670975eadadd8cc3cbb9fe5378fc";
  const authToken = functions.config().twilio.auth_token;
  const client = twilio(accountSid, authToken);

  const appPrefs = await new FirebaseApplicationPreferencesRepository().load();
  if (!appPrefs) throw new Error("App prefs not found");
  logWithTimestamp(LogLevel.Debug, "Loaded app prefs", appPrefs);

  //TODO: send the 200 back quickly and then poll for the info to be created

  //TODO: enforce uniqueness on anything we key off of to deliver messages (mobile number, slack channel)

  // Find and then purchase a phone number
  const phoneNumberData = await client
    .availablePhoneNumbers("US")
    .local.list(
      {
        areaCode: parseInt(orgPrefs.requestedAreaCode, 10),
        mmsEnabled: true,
        smsEnabled: true,
        voiceEnabled: true,
        pageSize: 1,
      },
      (err) => {
        if (err) {
          logWithTimestamp(LogLevel.Error, err.message);
          throw err;
        }
      },
    )
    .then((data) => {
      logWithTimestamp(LogLevel.Info, "Processing new phone number response...");
      logWithTimestamp(LogLevel.Debug, "Response", data);

      if (data.length < 1) {
        logWithTimestamp(LogLevel.Error, "No phone numbers returned for this area code");
        throw new Error("No phone numbers were found for this area code");
      }

      const number = data[0];

      return client.incomingPhoneNumbers.create({
        phoneNumber: number.phoneNumber,
        voiceApplicationSid: appPrefs.twimlVoiceAppSid,
        smsApplicationSid: appPrefs.twimlVoiceAppSid,
      });
    })
    .then((purchasedNumber) => {
      logWithTimestamp(LogLevel.Info, "Created phone number", purchasedNumber);
      // save number with organization preferences
      return {
        cecePhoneNumber: purchasedNumber.phoneNumber,
        cecePhoneNumberTwilioSid: purchasedNumber.sid,
      };
    });

  orgPrefs.cecePhoneNumber = phoneNumberData.cecePhoneNumber;
  orgPrefs.cecePhoneNumberTwilioSid = phoneNumberData.cecePhoneNumberTwilioSid;

  orgPrefs.slackChannelId = await createSlackChannel(orgPrefs);

  await sendIntroductorySms(orgPrefs, getIntroductoryMessages()).catch((err) => logWithTimestamp(LogLevel.Error, err));

  await postIntroductoryMessagesInSlack(orgPrefs, getIntroductoryMessages());

  const clientRepo = <IClientOrganizationRepository>new FirebaseClientOrganizationRepository();

  clientRepo.save(orgPrefs).catch(function (err) {
    logWithTimestamp(LogLevel.Error, "Error saving org prefs: " + err);
    return;
  });
};

export const provisionOfficeHttpController = app;

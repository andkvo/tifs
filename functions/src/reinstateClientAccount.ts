import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
import { ClientOrganizationRepository } from "./models/clientOrganizations/ClientOrganizationRepository";
import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import { FormatsPhoneNumbers } from "./models/common/FormatsPhoneNumbers";
import { curryLogWithTimestamp, LogLevel } from "./firebase-utils";
import * as functions from "firebase-functions";
import * as twilio from "twilio";
import { Message } from "firebase-functions/lib/providers/pubsub";
import { SendQuickMessagesToClient } from "./models/domain/SendQuickMessagesToClient";
import { FormatsCurrency } from "./models/common/FormatsCurrency";
import { FirebaseAccountingRepository } from "./models/firebase/FirebaseAccountingRepository";
import { ClientOrganization } from "./models/clientOrganizations/ClientOrganization";
import { IIdentity } from "./models/common/IIdentity";
import * as Joi from "joi";
import { verifyObjectHasSchemaAndCast } from "./util/pubsubutil";
import { FirebaseApplicationPreferencesRepository } from "./models/firebase/FirebaseApplicationPreferencesRepository";
import { IApplicationPreferences } from "./models/application/IApplicationPreferences";
import { IClientAccountingRepository } from "./models/accounting/IClientAccountingRepository";

type EventContext = functions.EventContext;

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

async function decodePayload(message: Message, context: EventContext) {
  logWithTimestamp(LogLevel.Debug, "Received message", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", context);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded payload", payload);
  return payload;
}

interface IClientOrg {
  id: string;
}

const iClientOrgSchema = {
  id: Joi.string(),
};

export const reinstateClientAccountPubSubMessageHandler = async (message: Message, context: EventContext) => {
  const payload = await decodePayload(message, context);

  const client = verifyObjectHasSchemaAndCast<IClientOrg>(payload.client, iClientOrgSchema);
  const clientRepo: IClientOrganizationRepository = new ClientOrganizationRepository(
    new FirebaseClientOrganizationRepository(),
    new FormatsPhoneNumbers(),
  );
  const orgPrefs = await clientRepo.find(client.id);
  const appPrefs = await new FirebaseApplicationPreferencesRepository().load();
  if (!appPrefs) throw new Error("App prefs could not be loaded");
  if (!orgPrefs) throw new Error("App prefs could not be loaded");

  await reinstateClientAccountDecodedMessageHandler(appPrefs, clientRepo, orgPrefs);
};

async function reinstateClientAccountDecodedMessageHandler(
  appPrefs: IApplicationPreferences,
  clientRepo: IClientOrganizationRepository,
  orgPrefs: ClientOrganization & IIdentity,
) {
  if (orgPrefs) {
    logWithTimestamp(LogLevel.Debug, "Organization found", orgPrefs);

    const accountingRepo: IClientAccountingRepository = new FirebaseAccountingRepository(orgPrefs.id);
    const clientBalance = await accountingRepo.getClientAccountBalance();

    if (clientBalance > orgPrefs.minimumBalanceRequiredInTenths) {
      await reinstateAccount(appPrefs, orgPrefs, clientRepo);
    }

    if (clientBalance < orgPrefs.warningBalanceInTenths) {
      await sendBalanceWarning(orgPrefs, clientRepo);
    }
  }
}

async function sendBalanceWarning(orgPrefs: ClientOrganization & IIdentity, clientRepo: IClientOrganizationRepository) {
  if (!orgPrefs.wasWarnedAboutBalance) {
    const minBalanceString = new FormatsCurrency().formatTenths(orgPrefs.minimumBalanceRequiredInTenths);

    const quickMessenger = new SendQuickMessagesToClient(orgPrefs, makeTwilioClient());
    await quickMessenger.sendMessagesToClient([
      `Your account balance is getting low.
      To avoid an interruption of service, you must maintain a minimum account balance of ${minBalanceString}. 
      Please log in to your account to add funds.`,
    ]);
  }
}

async function reinstateAccount(
  appPrefs: IApplicationPreferences,
  orgPrefs: ClientOrganization & IIdentity,
  clientRepo: IClientOrganizationRepository,
) {
  const alreadyReinstated = !orgPrefs.isAccountSuspended;

  if (alreadyReinstated) {
    return;
  }

  orgPrefs.isAccountSuspended = false;
  await clientRepo.save(orgPrefs);
  const twilioClient = makeTwilioClient();

  try {
    await twilioClient.incomingPhoneNumbers(orgPrefs.cecePhoneNumberTwilioSid).update({
      smsApplicationSid: appPrefs.twimlVoiceAppSid,
      voiceApplicationSid: appPrefs.twimlVoiceAppSid,
    });
  } catch (err) {
    logWithTimestamp(LogLevel.Error, (err as Error).toString());
    return;
  }
}

function makeTwilioClient(): twilio.Twilio {
  const config = {
    accountSid: functions.config().twilio.account_sid,
    authToken: functions.config().twilio.auth_token,
  };
  return twilio(config.accountSid, config.authToken);
}

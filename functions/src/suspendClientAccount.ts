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
import { IAccountingRepository } from "./models/accounting/IAccountingRepository";
import { ClientOrganization } from "./models/clientOrganizations/ClientOrganization";
import { IIdentity } from "./models/common/IIdentity";
type EventContext = functions.EventContext;

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

async function decodePayload(message: Message, context: EventContext) {
  logWithTimestamp(LogLevel.Debug, "Received message", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", context);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded payload", payload);
  return payload;
}

export const suspendClientAccountPubSubMessageHandler = async (message: Message, context: EventContext) => {
  const payload = await decodePayload(message, context);

  const clientRepo: IClientOrganizationRepository = new ClientOrganizationRepository(
    new FirebaseClientOrganizationRepository(),
    new FormatsPhoneNumbers(),
  );
  const orgPrefs = await clientRepo.find(payload.id);

  if (orgPrefs) {
    logWithTimestamp(LogLevel.Debug, "Organization found", orgPrefs);

    const accountingRepo: IAccountingRepository = new FirebaseAccountingRepository();
    const clientBalance = await accountingRepo.getClientAccountBalance(orgPrefs.id);

    if (clientBalance < orgPrefs.minimumBalanceRequiredInTenths) {
      await suspendAccount(orgPrefs, clientRepo);
    }

    if (clientBalance < orgPrefs.warningBalanceInTenths) {
      await sendBalanceWarning(orgPrefs, clientRepo);
    }
  }
};

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

async function suspendAccount(orgPrefs: ClientOrganization & IIdentity, clientRepo: IClientOrganizationRepository) {
  const alreadySuspended = orgPrefs.isAccountSuspended;

  orgPrefs.isAccountSuspended = true;
  await clientRepo.save(orgPrefs);
  const twilioClient = makeTwilioClient();

  if (!alreadySuspended) {
    const minBalanceString = new FormatsCurrency().formatTenths(orgPrefs.minimumBalanceRequiredInTenths);
    const quickMessenger = new SendQuickMessagesToClient(orgPrefs, twilioClient);
    await quickMessenger.sendMessagesToClient([
      `Your account has been suspended due to your failure to maintain a minimum balance of ${minBalanceString}.
      This phone number will be deleted from our system in 30 days.
      To continue your service, please log in to your account to add funds.`,
    ]);
  }

  try {
    await twilioClient.incomingPhoneNumbers(orgPrefs.cecePhoneNumberTwilioSid).update({
      smsApplicationSid: "",
      smsUrl: "",
      smsMethod: "",
      voiceApplicationSid: "",
      voiceUrl: "",
      voiceMethod: "",
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

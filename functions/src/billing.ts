import * as admin from "firebase-admin";
import { curryLogWithTimestamp, LogLevel } from "./firebase-utils";
import { Transaction } from "@google-cloud/firestore";
import { ClientAccountLedgerEntry } from "./models/accounting/ClientAccountLedgerEntry";
import { IApplicationPreferencesRepository } from "./models/application/IApplicationPreferencesRepository";
import { FirebaseApplicationPreferencesRepository } from "./models/firebase/FirebaseApplicationPreferencesRepository";
import { IPubSub } from "./models/pubsub/IPubSub";
import { FirebasePubSub } from "./models/firebase/FirebasePubSub";
import { Message } from "firebase-functions/lib/providers/pubsub";
import { EventContext } from "firebase-functions";
import * as moment from "moment";
import { ClientOrganizationRepository } from "./models/clientOrganizations/ClientOrganizationRepository";
import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import { FormatsPhoneNumbers } from "./models/common/FormatsPhoneNumbers";
import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
import { verifyObjectHasSchemaAndCast } from "./util/pubsubutil";
import * as Joi from "joi";

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

export const fundsAddedBillingPubSubHandler = async (message: Message, context: EventContext) => {
  const payload = await decodePayload(message, context);

  const charge: ICharge = verifyObjectHasSchemaAndCast<ICharge>(payload.charge, getChargeValidator());
  const client: IClientOrg = verifyObjectHasSchemaAndCast<IClientOrg>(payload.client, getClientValidator());

  const entry: ClientAccountLedgerEntry = {
    clientId: client.id,
    createDate: new Date(Date.now()),
    creditSource: "Stripe",
    creditType: "Cash",
    eventDate: moment.unix(charge.timestamp).toDate(),
    finalized: false,
    traceKey: charge.id,
    totalValueInTenths: charge.amountInTenths,
    quantity: 1,
    unitValueInTenths: charge.amountInTenths,
  };

  const db = admin.firestore();
  const lock = db.collection("clientLedgerEntries").doc(client.id).collection("stripeChargesHandled").doc(charge.id);

  const pubsub: IPubSub = new FirebasePubSub();

  try {
    await addNewLedgerEntry(
      client.id,
      entry,
      (tx: Transaction) => {
        return tx.create(lock, { date: new Date(Date.now()) }); // transaction will fail if this already exists, effectively locking this event
      },
      (err) => {
        pubsub.sendToErrorQueue("funds-added", message, err);
      },
      async (balanceUpdateResult) => {
        await checkClientBalanceForReinstatement(balanceUpdateResult);
      },
    );
  } catch (err) {
    logWithTimestamp(LogLevel.Error, "Error adding ledger entry when adding funds: " + err);
  }
};

export const recordInboundSmsBillingPubSubMessageHandler = async (message: Message, context: EventContext) => {
  const payload = await decodePayload(message, context);

  const appPrefsRepo: IApplicationPreferencesRepository = new FirebaseApplicationPreferencesRepository();
  const appPrefs = await appPrefsRepo.load();

  if (!appPrefs) throw new Error("app prefs not found");

  const smsCost = appPrefs.smsCostInTenths;

  const entry: ClientAccountLedgerEntry = {
    clientId: payload.clientId,
    createDate: new Date(Date.now()),
    debitSource: "Twilio",
    debitType: "IncomingSMS",
    eventDate: moment(payload.timestamp).toDate(),
    finalized: false,
    traceKey: payload.id,
    totalValueInTenths: 0 - smsCost,
    quantity: 1,
    unitValueInTenths: 0 - smsCost,
  };

  const db = admin.firestore();
  const smsLock = db
    .collection("clientLedgerEntries")
    .doc(payload.clientId)
    .collection("incomingSmsHandled")
    .doc(payload.id);

  const pubsub: IPubSub = new FirebasePubSub();

  try {
    await addNewLedgerEntry(
      payload.clientId,
      entry,
      (tx: Transaction) => {
        return tx.create(smsLock, { date: new Date(Date.now()) }); // transaction will fail if this already exists, effectively locking this SMS
      },
      (err) => {
        pubsub.sendToErrorQueue("accounting-record-inbound-sms", message, err);
      },
      async (balanceUpdateResult) => {
        await checkClientBalanceForSuspension(balanceUpdateResult);
      },
    );
  } catch (err) {
    logWithTimestamp(LogLevel.Error, "Error adding ledger entry for incoming SMS: " + err);
  }
};

export const recordOutboundSmsBillingPubSubMessageHandler = async (message: any, context: any) => {
  logWithTimestamp(LogLevel.Debug, "Received RecordOutboundSmsBillingMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", context);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded RecordOutboundSmsBillingMessage", payload);
  logWithTimestamp(LogLevel.Debug, "Message Context", context);

  const appPrefsRepo: IApplicationPreferencesRepository = new FirebaseApplicationPreferencesRepository();
  const appPrefs = await appPrefsRepo.load();

  if (!appPrefs) throw new Error("app prefs not found");

  const smsCost = appPrefs.smsCostInTenths;

  const entry: ClientAccountLedgerEntry = {
    clientId: payload.clientId,
    createDate: new Date(Date.now()),
    debitSource: "Twilio",
    debitType: "OutgoingSMS",
    eventDate: moment(payload.timestamp).toDate(),
    finalized: false,
    traceKey: payload.id,
    totalValueInTenths: 0 - smsCost,
    quantity: 1,
    unitValueInTenths: 0 - smsCost,
  };

  const db = admin.firestore();
  const smsLock = db
    .collection("clientLedgerEntries")
    .doc(payload.clientId)
    .collection("outgoingSmsHandled")
    .doc(payload.id);

  const pubsub: IPubSub = new FirebasePubSub();

  try {
    await addNewLedgerEntry(
      payload.clientId,
      entry,
      (tx: Transaction) => {
        return tx.create(smsLock, { date: new Date(Date.now()) }); // transaction will fail if this already exists, effectively locking this SMS
      },
      (err) => {
        pubsub.sendToErrorQueue("accounting-record-outbound-sms", message, err);
      },
      async (balanceUpdateResult) => {
        await checkClientBalanceForSuspension(balanceUpdateResult);
      },
    );
  } catch (err) {
    logWithTimestamp(LogLevel.Error, "Error adding ledger entry for outgoing SMS: " + err);
  }
};

interface IBalanceUpdateTransactionResult {
  success: boolean;
  clientId: string;
  oldBalanceInTenths?: number;
  newBalanceInTenths?: number;
}

async function addNewLedgerEntry(
  clientId: string,
  entry: ClientAccountLedgerEntry,
  deduplicationCallback: (tx: Transaction) => Transaction,
  onTransactionFailed: (error: string) => void,
  onTransactionFinally: (result: IBalanceUpdateTransactionResult) => void,
) {
  const db = admin.firestore();
  const clientRef = db.collection("clientLedgerEntries").doc(clientId);
  const clientLedgerDocSnapshot = await clientRef.get();
  const shouldCreateClientLedgerDoc = !clientLedgerDocSnapshot.exists;

  const balanceUpdateTransactionResult: IBalanceUpdateTransactionResult = {
    success: false,
    clientId: clientId,
  };

  if (shouldCreateClientLedgerDoc) {
    try {
      await db.runTransaction(async (tx) => {
        return tx.create(clientRef, { mostRecentEntry: "" });
      });
    } catch (e) {
      logWithTimestamp(LogLevel.Error, "Could not create client ledger", e);
    }
  }

  try {
    await db.runTransaction(async (tx) => {
      const clientDoc = await tx.get(clientRef);
      const currentBalanceId = clientDoc.data()?.mostRecentEntry || "";
      let balanceBefore = 0;

      if (currentBalanceId !== "") {
        logWithTimestamp(LogLevel.Debug, "Found a record that holds the current balance: ", currentBalanceId);
        const currentBalanceRef = db
          .collection("clientLedgerEntries")
          .doc(clientId)
          .collection("ledgerEntries")
          .doc(currentBalanceId);
        const currentBalanceRecord = await tx.get(currentBalanceRef);
        balanceBefore = currentBalanceRecord.data()?.newBalanceInTenths || 0;
      }

      entry.oldBalanceInTenths = balanceBefore;
      entry.newBalanceInTenths = balanceBefore + entry.totalValueInTenths;

      balanceUpdateTransactionResult.oldBalanceInTenths = entry.oldBalanceInTenths;
      balanceUpdateTransactionResult.newBalanceInTenths = entry.newBalanceInTenths;

      logWithTimestamp(LogLevel.Debug, "Old balance: ", balanceBefore);
      logWithTimestamp(LogLevel.Debug, "New balance: ", entry.newBalanceInTenths);

      const newLedgerEntryRef = db.collection(`clientLedgerEntries/${clientId}/ledgerEntries`).doc();

      return deduplicationCallback(tx) // some write operation that will fail if this is a duplicate
        .create(newLedgerEntryRef, entry)
        .update(clientRef, { mostRecentEntry: newLedgerEntryRef.id });
    });
    logWithTimestamp(LogLevel.Info, "Transaction completed successfully.");
    balanceUpdateTransactionResult.success = true;
    onTransactionFinally(balanceUpdateTransactionResult);
  } catch (e) {
    balanceUpdateTransactionResult.success = false;

    const codedError = <{ code: number } & string>e;

    if (codedError.code === 10) {
      logWithTimestamp(LogLevel.Warn, codedError);
      onTransactionFailed(codedError.toString());
    } else {
      throw e;
    }

    onTransactionFinally(balanceUpdateTransactionResult);
  }
}

async function decodePayload(message: Message, context: EventContext) {
  logWithTimestamp(LogLevel.Debug, "Received message", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", context);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded payload", payload);
  return payload;
}

async function checkClientBalanceForSuspension(result: IBalanceUpdateTransactionResult) {
  const clientRepo: IClientOrganizationRepository = new ClientOrganizationRepository(
    new FirebaseClientOrganizationRepository(),
    new FormatsPhoneNumbers(),
  );
  const client = await clientRepo.find(result.clientId);

  if (!client) throw new Error("client not found");

  logWithTimestamp(
    LogLevel.Debug,
    `New balance is ${result.newBalanceInTenths} and required balance is ${client.minimumBalanceRequiredInTenths}`,
  );

  if (
    (result.newBalanceInTenths && result.newBalanceInTenths < client.warningBalanceInTenths) ||
    (result.newBalanceInTenths && result.newBalanceInTenths < client.minimumBalanceRequiredInTenths)
  ) {
    logWithTimestamp(LogLevel.Info, "Client account balance is too low; triggering suspension message.");

    const pubsub: IPubSub = new FirebasePubSub();
    await pubsub.triggerMessage("suspend-account", client);
  }
}

async function checkClientBalanceForReinstatement(result: IBalanceUpdateTransactionResult) {
  const clientRepo: IClientOrganizationRepository = new ClientOrganizationRepository(
    new FirebaseClientOrganizationRepository(),
    new FormatsPhoneNumbers(),
  );
  const client = await clientRepo.find(result.clientId);
  if (!client) throw new Error("client not found");

  logWithTimestamp(
    LogLevel.Debug,
    `New balance is ${result.newBalanceInTenths} and required balance is ${client.minimumBalanceRequiredInTenths}`,
  );

  if (result.newBalanceInTenths && result.newBalanceInTenths > client.minimumBalanceRequiredInTenths) {
    logWithTimestamp(LogLevel.Info, "Client account balance is high enough again; triggering reinstatement message.");

    const pubsub: IPubSub = new FirebasePubSub();
    await pubsub.triggerMessage("reinstate-account", client);
  }
}

interface ICharge {
  id: string;
  amountInTenths: number;
  timestamp: number;
}

interface IClientOrg {
  id: string;
}

function getChargeValidator() {
  return {
    id: Joi.string(),
    amountInTenths: Joi.number().greater(1),
    timestamp: Joi.number().greater(1),
  };
}

function getClientValidator() {
  return { id: Joi.string() };
}

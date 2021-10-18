import express = require("express");
import { FirebaseClientOrganizationRepository } from "./models/firebase/FirebaseClientOrganizationRepository";
import { IClientOrganizationRepository } from "./models/clientOrganizations/IClientOrganizationRepository";
import { FirebaseAccountingRepository } from "./models/firebase/FirebaseAccountingRepository";
import * as moment from "moment";
import { LogLevel, curryLogWithTimestamp } from "./firebase-utils";
import * as _ from "lodash";
import { DebitType } from "./models/accounting/ClientAccountLedgerEntry";
import { FormatsCurrency } from "./models/common/FormatsCurrency";
import { IClientAccountingRepository } from "./models/accounting/IClientAccountingRepository";

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

const app = express();
app.use(express.json());

app.get("/billing-report", async (req, res) => {
  const clientId = (req.query.clientId || "") as string;

  if (!clientId) throw new Error("A client ID is required for this endpoint");

  const startDate = moment(req.query.startDate as string).toDate();

  logWithTimestamp(LogLevel.Debug, "start date", startDate);

  let minimumBalance = 0,
    startingBalance = 0,
    accountCredits = 0,
    incomingTextMessageCount = 0,
    outgoingTextMessageCount = 0,
    laborExpenses = 0,
    incomingEmailCount = 0,
    outgoingEmailCount = 0,
    unrecordedPhoneCallMinutes = 0,
    recordedPhoneCallMinutes = 0,
    phoneCallTranscriptionMinutes = 0,
    endingBalance = 0,
    incomingTextMessageCost = 0,
    outgoingTextMessageCost = 0,
    unrecordedPhoneCallCost = 0,
    recordedPhoneCallCost = 0,
    transcribedPhoneCallCost = 0;

  const formatter = new FormatsCurrency();

  const formatTenths = (input: number) => {
    return formatter.formatTenths(input / 1000);
  };

  const accountingApi: IClientAccountingRepository = new FirebaseAccountingRepository(clientId);

  minimumBalance = await getMinimumBalanceForClient(clientId);
  startingBalance = await accountingApi.getClientAccountBalance(startDate);
  const ledgerEntries = await accountingApi.getLedgerEntriesForClient(startDate);

  logWithTimestamp(LogLevel.Debug, "Found ledger entries", ledgerEntries);

  const incomingSmsKey: DebitType = "IncomingSMS";
  const outgoingSmsKey: DebitType = "OutgoingSMS";

  const counts = _.countBy(ledgerEntries, (e) => {
    switch (e.debitType) {
      default:
        return "other";
    }
  });

  accountCredits = _.filter(ledgerEntries, (e) => !!e.creditType)
    .map((e) => e.totalValueInTenths)
    .reduce((sum, v) => sum + v, 0);

  incomingTextMessageCount = counts[incomingSmsKey] || 0;
  outgoingTextMessageCount = counts[outgoingSmsKey] || 0;
  incomingTextMessageCount = _.filter(ledgerEntries, (e) => e.debitType === incomingSmsKey)
    .map((e) => e.quantity)
    .reduce((sum, v) => sum + v, 0);

  incomingTextMessageCost = Math.abs(
    _.filter(ledgerEntries, (e) => e.debitType === incomingSmsKey)
      .map((e) => e.totalValueInTenths)
      .reduce((sum, v) => sum + v, 0),
  );

  outgoingTextMessageCount = _.filter(ledgerEntries, (e) => e.debitType === outgoingSmsKey)
    .map((e) => e.quantity)
    .reduce((sum, v) => sum + v, 0);

  outgoingTextMessageCost = Math.abs(
    _.filter(ledgerEntries, (e) => e.debitType === outgoingSmsKey)
      .map((e) => e.totalValueInTenths)
      .reduce((sum, v) => sum + v, 0),
  );

  endingBalance = await accountingApi.getClientAccountBalance();

  res.contentType("html");
  res.end(`<pre>Minimum balance: ${formatTenths(minimumBalance)}
  Starting balance: ${formatTenths(startingBalance)}
  Account credits: ${formatTenths(accountCredits)}
  Text messages you sent to Cece: ${incomingTextMessageCount} (${formatTenths(incomingTextMessageCost)})
  Text message responses Cece sent to you: ${outgoingTextMessageCount} (${formatTenths(outgoingTextMessageCost)})
  Labor expenses: ${formatTenths(laborExpenses)}
  Emails you sent to Cece: ${incomingEmailCount}
  Emails responses Cece sent to you: ${outgoingEmailCount}
  Phone call minutes: ${unrecordedPhoneCallMinutes} (${formatTenths(unrecordedPhoneCallCost)})
  Phone call minutes (recordings): ${recordedPhoneCallMinutes} (${formatTenths(recordedPhoneCallCost)})
  Phone call minutes (transcriptions): ${phoneCallTranscriptionMinutes} (${formatTenths(transcribedPhoneCallCost)})
  Ending balance: ${formatTenths(endingBalance)}</pre>`);
});

function getMinimumBalanceForClient(clientId: string): Promise<number> {
  const clientRepo: IClientOrganizationRepository = new FirebaseClientOrganizationRepository();

  return clientRepo.find(clientId).then((org) => {
    if (!org) return 0;
    return org.minimumBalanceRequiredInTenths;
  });
}

export const manageClientsHttpController = app;

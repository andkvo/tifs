import { ICommand } from "../domain/ICommand";
import { IClientAccountingRepository } from "../models/accounting/IClientAccountingRepository";
import { ClientOrganization } from "../models/clientOrganizations/ClientOrganization";
import { IClientOrganizationRepository } from "../models/clientOrganizations/IClientOrganizationRepository";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";
import { IOutgoingMessageQueue } from "../models/textMessages/IOutgoingMessageQueue";
import { IQueuedBroadcast } from "../models/textMessages/IQueuedBroadcast";

export interface SendQueuedMessageResult {
  ok: boolean;
  status: SendQueuedMessageResultStatus;
}

export enum SendQueuedMessageResultStatus {
  LOCK_FAILED,
  ALREADY_PROCESSED,
  OK,
  SEND_FAILED,
  INSUFFICIENT_BALANCE,
}

export function SendQueuedMessageCommandFactory(
  slack: SlackWorkspaceSdk,
  slackUserId: string,
  clientId: string,
  queuedMessageId: string,
  messageQueue: IOutgoingMessageQueue,
  clientRepo: IClientOrganizationRepository,
  accountingRepo: IClientAccountingRepository,
  sendWarningMessage: (client: ClientOrganization) => Promise<void>,
  sendQueuedBroadcast: (broadcast: IQueuedBroadcast) => Promise<boolean>,
  updateBalanceOnClient: (client: ClientOrganization) => Promise<void>,
): ICommand<SendQueuedMessageResult> {
  return async function SendQueuedMessageCommand(): Promise<SendQueuedMessageResult> {
    const conv = await slack.openConversation(slackUserId);

    try {
      const lockingResult = await messageQueue.takeSendingLock(queuedMessageId);
      const locked = lockingResult.locked;
      if (!lockingResult.ok || !locked) return { ok: false, status: SendQueuedMessageResultStatus.LOCK_FAILED };

      try {
        const client = await clientRepo.find(clientId);
        if (!client) throw new Error("Client not found");
        const smsCost = client.smsCostInTenths;

        const message = lockingResult.locked?.model;
        if (!message) throw new Error("Locked message not available");

        const preliminaryBillingRecord = await accountingRepo.createPreliminaryBillingRecord(
          smsCost,
          message.recipients.length,
          `outgoing_sms_${message.id}`,
        );

        try {
          const maxBalance = await accountingRepo.getBalanceWithPreliminaries();

          if (maxBalance < client.warningBalanceInTenths) {
            sendWarningMessage(client);
          }

          if (maxBalance >= client.minimumBalanceRequiredInTenths) {
            const messageSendResponse = await sendQueuedBroadcast(message);

            if (messageSendResponse) {
              await accountingRepo.convertToFinalizedBillingRecord(preliminaryBillingRecord);
              await messageQueue.releaseSendingLock(locked, true);
              await updateBalanceOnClient(client);
              return { ok: true, status: SendQueuedMessageResultStatus.OK };
            } else {
              await accountingRepo.deletePremliminaryBillingRecord(preliminaryBillingRecord);
              await messageQueue.releaseSendingLock(locked, false);
              return { ok: false, status: SendQueuedMessageResultStatus.SEND_FAILED };
            }
          } else {
            return { ok: false, status: SendQueuedMessageResultStatus.INSUFFICIENT_BALANCE };
          }
        } catch (err) {
          await accountingRepo.deletePremliminaryBillingRecord(preliminaryBillingRecord);
          throw err;
        }
      } catch (err) {
        await messageQueue.releaseSendingLock(locked, false);
        throw err;
      }
    } catch (err) {
      slack.postMessage(
        conv.channel.id,
        "There was an unexpected error. Please contact help@textitfromslack.com to set up your free trial.",
      );
      throw err;
    }
  };
}

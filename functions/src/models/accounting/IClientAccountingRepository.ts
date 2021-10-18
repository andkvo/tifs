import { ClientAccountLedgerEntry } from "./ClientAccountLedgerEntry";
import { IIdentity } from "../common/IIdentity";

export interface IClientAccountingRepository {
  getClientAccountBalance(asOfDate?: Date): Promise<number>;
  getLedgerEntriesForClient(startDate: Date, endDate?: Date): Promise<Array<ClientAccountLedgerEntry & IIdentity>>;
  save(entry: ClientAccountLedgerEntry & IIdentity): void;
  saveNew(entry: ClientAccountLedgerEntry): void;
  createPreliminaryBillingRecord(
    amount: number,
    quantity: number,
    traceKey: string,
  ): Promise<ClientAccountLedgerEntry & IIdentity>;
  getBalanceWithPreliminaries(): Promise<number>;
  convertToFinalizedBillingRecord(record: ClientAccountLedgerEntry & IIdentity): Promise<void>;
  deletePremliminaryBillingRecord(record: ClientAccountLedgerEntry & IIdentity): Promise<void>;
}

import { ClientAccountLedgerEntry } from "./ClientAccountLedgerEntry";
import { IIdentity } from "../common/IIdentity";

export interface IAccountingRepository {
  getClientAccountBalance(clientId: string, asOfDate?: Date): Promise<number>;
  getLedgerEntriesForClient(
    clientId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<Array<ClientAccountLedgerEntry & IIdentity>>;
  save(entry: ClientAccountLedgerEntry & IIdentity): void;
  saveNew(entry: ClientAccountLedgerEntry): void;
}

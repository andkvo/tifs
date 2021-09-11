import { IAccountingRepository } from "../accounting/IAccountingRepository";
import * as admin from "firebase-admin";
import { Timestamp, QueryDocumentSnapshot } from "@google-cloud/firestore";
import { ClientAccountLedgerEntry } from "../accounting/ClientAccountLedgerEntry";
import { IIdentity } from "../common/IIdentity";

export class FirebaseAccountingRepository implements IAccountingRepository {
  async getClientAccountBalance(clientId: string, asOfDate?: Date): Promise<number> {
    const lastCalculated = await this.getBalanceInternal(clientId, asOfDate);
    return lastCalculated && lastCalculated.newBalanceInTenths ? lastCalculated?.newBalanceInTenths || 0 : 0;
  }

  getLedgerEntriesForClient(
    clientId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<Array<ClientAccountLedgerEntry & IIdentity>> {
    if (!clientId) {
      throw new Error("client is required to look up client ledger");
    }

    // console.info("ledger entries for client id", clientId);
    // console.info("start date", startDate);

    return admin
      .firestore()
      .collection("clientLedgerEntries")
      .doc(clientId)
      .collection("ledgerEntries")
      .where("eventDate", ">=", Timestamp.fromDate(startDate))
      .orderBy("eventDate", "asc")
      .get()
      .then((qs) => {
        const ledger: Array<ClientAccountLedgerEntry & IIdentity> = [];

        qs.forEach((doc) => {
          // console.info('mapping found record');
          ledger.push(this.mapDocumentData(doc));
        });

        return ledger;
      });
  }

  save(entry: ClientAccountLedgerEntry & IIdentity) {
    throw new Error("not implemented");
  }

  saveNew(entry: ClientAccountLedgerEntry) {
    throw new Error("not implemented");
  }

  private async getBalanceInternal(clientId: string, asOfDate?: Date): Promise<ClientAccountLedgerEntry | null> {
    if (!clientId) {
      throw new Error("client is required to look up client balance");
    }

    // console.info("balance for client id", clientId);
    // console.info("asOfDate", asOfDate);

    let query = admin
      .firestore()
      .collection("clientLedgerEntries")
      .doc(clientId)
      .collection("ledgerEntries")
      .orderBy("eventDate", "desc");

    if (asOfDate) {
      query = query.where("eventDate", "<", Timestamp.fromDate(asOfDate));
    }

    return query
      .limit(1)
      .get()
      .then((qs) => {
        let lastCalculated: ClientAccountLedgerEntry | null = null;

        if (qs.size > 1) {
          throw new Error("Requested one record but got more somehow");
        }

        qs.forEach((doc) => {
          lastCalculated = this.mapDocumentData(doc);
        });

        // console.info('returning record for balance', lastCalculated);

        return lastCalculated;
      });
  }

  private mapDocumentData(qds: QueryDocumentSnapshot): ClientAccountLedgerEntry & IIdentity {
    const docData = qds.data();
    return {
      id: qds.id,
      clientId: docData.clientId,
      createDate: docData.createDate,
      creditSource: docData.creditSource,
      creditType: docData.creditType,
      debitSource: docData.debitSource,
      debitType: docData.debitType,
      eventDate: docData.eventDate,
      newBalanceInTenths: docData.newBalanceInTenths,
      oldBalanceInTenths: docData.oldBalanceInTenths,
      traceKey: docData.traceKey,
      totalValueInTenths: docData.totalValueInTenths,
      quantity: docData.quantity,
      unitValueInTenths: docData.unitValueInTenths,
      finalized: docData.finalized,
    };
  }
}

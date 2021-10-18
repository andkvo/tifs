import { IClientAccountingRepository } from "../accounting/IClientAccountingRepository";
import * as admin from "firebase-admin";
import { Timestamp, QueryDocumentSnapshot } from "@google-cloud/firestore";
import { ClientAccountLedgerEntry } from "../accounting/ClientAccountLedgerEntry";
import { IIdentity } from "../common/IIdentity";
import _ = require("lodash");

export class FirebaseAccountingRepository implements IClientAccountingRepository {
  private clientId: string;
  private collectionPath: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.collectionPath = `organizationPreferences/${this.clientId}/ledgerEntries`;
  }

  async createPreliminaryBillingRecord(
    amount: number,
    quantity: number,
    traceKey: string,
  ): Promise<ClientAccountLedgerEntry & IIdentity> {
    const ledger: ClientAccountLedgerEntry = {
      clientId: this.clientId,
      quantity,
      eventDate: new Date(),
      createDate: new Date(),
      unitValueInTenths: amount,
      totalValueInTenths: amount * quantity,
      traceKey: "",
      finalized: false,
    };
    const newRecord = await admin.firestore().collection(this.collectionPath).add(ledger);
    const id = newRecord.id;
    return { id, ...ledger };
  }

  async getBalanceWithPreliminaries(): Promise<number> {
    const entries = await admin.firestore().collection(this.collectionPath).get();
    return _.sumBy(entries.docs, (d) => d.data().totalValueInTenths);
  }

  async convertToFinalizedBillingRecord(record: ClientAccountLedgerEntry & IIdentity): Promise<void> {
    await admin.firestore().doc(`${this.collectionPath}/${record.id}`).set({ finalized: true }, { merge: true });
    return;
  }

  async deletePremliminaryBillingRecord(record: ClientAccountLedgerEntry & IIdentity): Promise<void> {
    await admin.firestore().doc(`${this.collectionPath}/${record.id}`).delete();
    return;
  }

  async getClientAccountBalance(asOfDate?: Date): Promise<number> {
    const lastCalculated = await this.getBalanceInternal(asOfDate);
    return lastCalculated && lastCalculated.newBalanceInTenths ? lastCalculated?.newBalanceInTenths || 0 : 0;
  }

  getLedgerEntriesForClient(startDate: Date, endDate?: Date): Promise<Array<ClientAccountLedgerEntry & IIdentity>> {
    return admin
      .firestore()
      .collection(this.collectionPath)
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

  private async getBalanceInternal(asOfDate?: Date): Promise<ClientAccountLedgerEntry | null> {
    let query = admin.firestore().collection(this.collectionPath).orderBy("eventDate", "desc");

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

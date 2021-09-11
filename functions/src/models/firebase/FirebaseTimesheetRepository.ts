import { ITimesheetRepository } from "../timesheets/ITimesheetRepository";
import { ITimesheet } from "../timesheets/ITimesheet";
import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";

export class FirebaseTimesheetRepository implements ITimesheetRepository {
  save(timesheet: ITimesheet): Promise<ITimesheet & IIdentity> {
    const db = admin.firestore();
    return db
      .collection("timesheets")
      .add(timesheet)
      .then((doc) => {
        return { id: doc.id, ...timesheet };
      });
  }
}

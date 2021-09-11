import { ITimesheet } from "./ITimesheet";
import { IIdentity } from "../common/IIdentity";

export interface ITimesheetRepository {
  save(timesheet: ITimesheet): Promise<ITimesheet & IIdentity>;
}

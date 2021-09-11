import { IFormatPhoneNumbers } from "./IFormatPhoneNumbers";

export class FormatsPhoneNumbers implements IFormatPhoneNumbers {
  format(arg: string): string {
    let returnVal = arg;

    if (!returnVal.match(/^\+/) && !returnVal.match(/^1/)) {
      returnVal = "1" + returnVal;
    }

    return "+" + returnVal.replace(/[^0-9]/g, "");
  }
}

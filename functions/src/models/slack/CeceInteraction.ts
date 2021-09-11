import { IncomingCallInteraction } from "./IncomingCallInteraction";

export class CeceInteraction {
  private interactionData: any;

  constructor(interactionData: any) {
    this.interactionData = interactionData;
  }

  public isIncomingPhoneCallInteraction() {
    return /incomingcall_/.test(this.interactionData.callback_id);
  }

  public createIncomingCallInteraction(): IncomingCallInteraction {
    return new IncomingCallInteraction(this.interactionData);
  }
}

export class IncomingCallInteraction {
  private interactionData: any;

  constructor(interactionData: any) {
    this.interactionData = interactionData;
  }

  public isAnswer(): boolean {
    return this.interactionData.actions[0].value === "answer";
  }

  public getSlackUserHandle(): string {
    return this.interactionData.user.name;
  }

  public getPhoneCallId(): string {
    const underscorePos = this.interactionData.callback_id.indexOf("_");

    if (underscorePos < 0) throw new Error("Invalid callback_id");

    return this.interactionData.callback_id.substring(underscorePos + 1);
  }
}

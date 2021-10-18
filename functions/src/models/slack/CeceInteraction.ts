export enum InteractionType {
  UNKNOWN,
  ACCEPT_TOS,
  SEND_QUEUED_MESSAGE,
}

export class CeceInteraction {
  private interactionData: any;

  constructor(interactionData: any) {
    this.interactionData = interactionData;
  }

  get type(): InteractionType {
    if (this.interactionData?.actions[0]?.value === "accept_tos") return InteractionType.ACCEPT_TOS;
    if (/^send_broadcast_/.test(this.interactionData?.actions[0]?.value)) return InteractionType.SEND_QUEUED_MESSAGE;
    return InteractionType.UNKNOWN;
  }

  get teamId(): string {
    return this.interactionData?.team?.id;
  }

  get userId(): string {
    return this.interactionData?.user?.id;
  }

  get broadcastId(): string {
    return (this.interactionData?.actions[0]?.value || "")
      .match(/_[^_]*$/)
      .pop()
      .substring(1);
  }
}

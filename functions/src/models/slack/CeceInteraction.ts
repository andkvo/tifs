export enum InteractionType {
  UNKNOWN,
  ACCEPT_TOS,
}

export class CeceInteraction {
  private interactionData: any;

  constructor(interactionData: any) {
    this.interactionData = interactionData;
  }

  get type(): InteractionType {
    if (this.interactionData?.actions[0]?.value === "accept_tos") return InteractionType.ACCEPT_TOS;
    return InteractionType.UNKNOWN;
  }

  get teamId(): string {
    return this.interactionData?.team?.id;
  }

  get userId(): string {
    return this.interactionData?.user?.id;
  }
}

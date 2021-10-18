import { SendQueuedMessageResult } from "../commands/SendQueuedMessageCommand";
import { ICommand } from "./ICommand";

export class Application {
  private beginFreeTrialCommand: ICommand<void>;
  private sendQueuedMessageCommand: ICommand<SendQueuedMessageResult>;

  constructor(beginFreeTrialCommand: ICommand<void>, sendQueuedMessageCommand: ICommand<SendQueuedMessageResult>) {
    this.beginFreeTrialCommand = beginFreeTrialCommand;
    this.sendQueuedMessageCommand = sendQueuedMessageCommand;
  }

  async beginFreeTrial() {
    return await this.beginFreeTrialCommand();
  }

  async sendQueuedMessage() {
    return await this.sendQueuedMessageCommand();
  }
}

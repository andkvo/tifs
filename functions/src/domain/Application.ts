import { ICommand } from "./ICommand";

export class Application {
  private beginFreeTrialCommand: ICommand;

  constructor(beginFreeTrialCommand: ICommand) {
    this.beginFreeTrialCommand = beginFreeTrialCommand;
  }

  async beginFreeTrial() {
    return await this.beginFreeTrialCommand();
  }
}

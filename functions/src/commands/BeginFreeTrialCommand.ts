import { ICommand } from "../domain/ICommand";
import { SlackWorkspaceSdk } from "../models/slack/SlackWorkspaceSdk";

export function BeginFreeTrialCommandFactory(slackUserId: string, slack: SlackWorkspaceSdk): ICommand {
  return async function BeginFreeTrialCommand() {
    const conv = await slack.openConversation(slackUserId);
    slack.postMessage(
      conv.channel.id,
      "Great! I have set up 888-555-1212 for you to use temporarily. I'll have to recycle it in one hour, but you can get your own number by signing up for a paid plan",
    );
    return Promise.resolve();
  };
}

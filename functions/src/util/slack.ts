import { curryLogWithTimestamp, LogLevel } from "../firebase-utils";
import * as functions from "firebase-functions";
import axios from "axios";

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

export interface PostSlackMessageResult {
  success: boolean;
  error?: string;
}

export async function postMessageInSlack(slackChannelId: string, message: string): Promise<PostSlackMessageResult> {
  logWithTimestamp(LogLevel.Info, "Posting message to slack...");

  const slackPostRequest = {
    channel: slackChannelId,
    text: message,
    as_user: "false",
  };

  logWithTimestamp(LogLevel.Debug, "Request body for Slack", slackPostRequest);

  const slackResult = await axios
    .post("https://slack.com/api/chat.postMessage", slackPostRequest, {
      headers: {
        authorization: "Bearer " + functions.config().slack.token, // replace with app token? either way, store in env
      },
    })
    .then((axiosResponse) => {
      const result = axiosResponse.data;
      logWithTimestamp(LogLevel.Debug, "Slack response", result);

      if (!result.ok) {
        return { success: false, error: result.error };
      }

      logWithTimestamp(LogLevel.Info, "Everything went well. Go look for your message in Slack.");
      return { success: true };
    })
    .catch((err) => {
      logWithTimestamp(LogLevel.Error, err);
      return { success: false, error: err };
    });

  if (slackResult.success) {
    return Promise.resolve(slackResult);
  }

  return Promise.reject(slackResult);
}

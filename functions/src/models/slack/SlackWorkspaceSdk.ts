import axios from "axios";

type MessageModificationCallback = (input: any) => void;

function isString(input: any) {
  return typeof input === "string" || input instanceof String;
}

export class SlackWorkspaceSdk {
  private accessToken: string;
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async openConversation(userId: string): Promise<{ channel: { id: string } }> {
    const axiosResponse = await axios.post(
      "https://slack.com/api/conversations.open",
      { users: userId },
      {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    return axiosResponse.data;
  }

  async postMessage(
    channelId: string,
    messageOrCallback: string | MessageModificationCallback,
  ): Promise<{ channel: string }> {
    const payload: any = {
      channel: channelId,
    };

    if (isString(messageOrCallback)) {
      payload.text = messageOrCallback as string;
    } else {
      const callback = messageOrCallback as MessageModificationCallback;
      callback(payload);
    }

    const axiosResponse = await axios.post("https://slack.com/api/chat.postMessage", payload, {
      headers: {
        authorization: `Bearer ${this.accessToken}`,
      },
    });

    return axiosResponse.data;
  }
}

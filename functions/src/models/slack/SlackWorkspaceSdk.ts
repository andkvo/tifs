import axios from "axios";

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

  async postMessage(channelId: string, message: string): Promise<{ channel: string }> {
    const axiosResponse = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: channelId,
        text: message,
      },
      {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    return axiosResponse.data;
  }
}

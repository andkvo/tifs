import { ClientOrganization } from "../clientOrganizations/ClientOrganization";
// import { logWithTimestampIfAboveThreshold, LogLevel } from "../../firebase-utils";
import Twilio = require("twilio/lib/rest/Twilio");
import { postMessageInSlack } from "../../util/slack";

// const logWithTimestamp = (messageLevel: LogLevel, message: string, inspect?: any) => {
//   logWithTimestampIfAboveThreshold(LogLevel.Debug, messageLevel, message, inspect);
// };

export class SendQuickMessagesToClient {
  private orgPrefs: ClientOrganization;
  // private twilioClient: Twilio;
  constructor(orgPrefs: ClientOrganization, twilioClient: Twilio) {
    this.orgPrefs = orgPrefs;
    // this.twilioClient = twilioClient;
  }
  sendMessagesToClient = async (messages: string[]) => {
    // await this.staggerSms(messages);
    await this.postMessagesInSlack(messages);
  };
  // private staggerSms = async (messages: string[]): Promise<any> => {
  //   logWithTimestamp(LogLevel.Info, "Sending SMS messages...");
  //   const promises = new Array<Promise<void>>();
  //   for (let i = 0; i < messages.length; i += 1) {
  //     const message = {
  //       body: messages[i],
  //       to: this.orgPrefs.clientMobileNumber,
  //       from: this.orgPrefs.cecePhoneNumber,
  //     };
  //     const staggeredTimeout = 1000 + 2000 * i;
  //     logWithTimestamp(LogLevel.Info, "queueing SMS " + (i + 1) + " for " + staggeredTimeout / 1000 + " seconds");
  //     promises.push(this.sendDelayedSms(message, staggeredTimeout));
  //   }
  //   return Promise.all(promises);
  // };
  // private sendDelayedSms = (message: { body: string; to: string; from: string }, timeout: number): Promise<void> => {
  //   return new Promise<void>((resolve, reject) => {
  //     setTimeout(() => {
  //       logWithTimestamp(LogLevel.Info, "sending SMS ", message);
  //       this.twilioClient.api.messages.create(message).catch((err) => {
  //         console.log("ERROR: ", err);
  //         reject(err);
  //       });
  //       resolve();
  //     }, timeout);
  //     return;
  //   });
  // };
  private postMessagesInSlack = async (messages: string[]): Promise<void> => {
    for (const message of messages) {
      await postMessageInSlack(this.orgPrefs.slackChannelId, message);
    }
    return Promise.resolve();
  };
}

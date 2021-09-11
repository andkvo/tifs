import { curryLogWithTimestamp, LogLevel } from "./firebase-utils";
//import { google } from 'googleapis';

const logWithTimestamp = curryLogWithTimestamp(LogLevel.Debug);

export const dailyTickPubSubMessageHandler = async (message: any, ctx: any) => {
  logWithTimestamp(LogLevel.Debug, "Received DailyTickMessage", message);
  logWithTimestamp(LogLevel.Debug, "Received message context", ctx);
  const payload = message.json;
  logWithTimestamp(LogLevel.Debug, "Decoded DailyTickMessage", payload);

  // try
  // {
  //   const gmail = google.gmail({ version: "v1", auth });
  //   const request = {
  //     'labelIds': ['INBOX'],
  //     'topicName': 'projects/digisec-dev/topics/gmail-event'
  //   }
  //   gmail.users().watch(userId="", body=request).execute();
  // }
  // catch(err)
  // {
  //   logWithTimestamp(LogLevel.Error, err);
  // }
};

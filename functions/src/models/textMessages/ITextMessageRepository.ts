import { TextMessage, OutgoingTextMessage } from "./TextMessage";
import { IIdentity } from "../common/IIdentity";

export interface ITextMessageRepository {
  saveNew(textMessage: TextMessage): Promise<TextMessage & IIdentity>;
  saveNewOutgoing(textMessage: OutgoingTextMessage): Promise<OutgoingTextMessage & IIdentity>;
}

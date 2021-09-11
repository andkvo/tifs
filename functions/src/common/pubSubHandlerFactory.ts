import { MessageTypeTag } from "../models/pubsub/IPubSub";

export default function pubSubHandlerFactory(functions: any) {
  return function handlePubSubTopic(
    messageTypeTag: MessageTypeTag,
    handler: (message: any, context: any) => Promise<void>,
  ) {
    return functions.pubsub.topic(messageTypeTag).onPublish(handler);
  };
}

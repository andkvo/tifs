import * as crypto from "crypto";
// import * as express from "express";
const tsscmp = require("tsscmp");
import type { IncomingMessage } from "http";

const rawBody = require("raw-body");

interface BufferedIncomingMessage extends IncomingMessage {
  rawBody: Buffer;
}

function isBufferedIncomingMessage(req: IncomingMessage): req is BufferedIncomingMessage {
  return Buffer.isBuffer((req as BufferedIncomingMessage).rawBody);
}

async function bufferIncomingMessage(req: IncomingMessage): Promise<BufferedIncomingMessage> {
  if (isBufferedIncomingMessage(req)) {
    return req;
  }
  const bufferedRequest = req as BufferedIncomingMessage;
  bufferedRequest.rawBody = await rawBody(req);
  return bufferedRequest;
}

export function MiddlewareFactory(mySigningSecret: string, currentTime: () => number) {
  return async function VerifySlackRequest(req: any, res: any, next: any) {
    const requestSignature = req.headers["x-slack-signature"] as string;
    const requestTimestampInSeconds = req.headers["x-slack-request-timestamp"] as string;

    if (!mySigningSecret) throw new Error("Configuration error - Slack signing secret not found");

    if (!requestSignature || !requestTimestampInSeconds) {
      console.debug("Missing signature or timestamp on request", {
        requestSignature,
        requestTimestampInSeconds,
      });
      return res.sendStatus(403);
    }

    const requestTimestampInSecondsInt = parseInt(requestTimestampInSeconds);

    if (isNaN(requestTimestampInSecondsInt)) {
      console.debug("Request timestamp is NaN", {
        requestTimestampInSeconds,
      });
      return res.sendStatus(403);
    }

    //check for replay attack
    if (Math.abs(Math.floor(currentTime() / 1000) - requestTimestampInSecondsInt) > 60 * 5) {
      console.debug("Request timestamp is more than five minutes ago", {
        requestTimestampInSeconds,
      });
      return res.sendStatus(400);
    }

    const bufferedReq = await bufferIncomingMessage(req);

    // compute hash
    const hmac = crypto.createHmac("sha256", mySigningSecret);
    const [requestVersion, requestHash] = requestSignature.split("=");

    if (requestVersion !== "v0") {
      throw new Error(`ERROR: unknown signature version`);
    }

    const mySignaturePayload = `${requestVersion}:${requestTimestampInSeconds}:${bufferedReq.rawBody.toString()}`;
    hmac.update(mySignaturePayload);

    const isSignatureValid = tsscmp(requestHash, hmac.digest("hex"));

    if (!isSignatureValid) {
      console.debug("Signature validation failed", {
        mySignaturePayload,
        requestSignature,
      });
      return res.sendStatus(403);
    }

    return next();
  };
}

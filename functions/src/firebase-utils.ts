import * as cors from "cors";
import * as functions from "firebase-functions";
import express = require("express");

export const aaCors = cors({ origin: /meetcece\.com$/ }); // origin can be a boolean, string (single domain), regexp, or function, which configures a cors obj and invokes a callback with it

export const sanitizePath = (
  callback: (req: express.Request, res: express.Response) => void,
): ((req: express.Request, res: express.Response) => void) => {
  return (req, res) => {
    if (!req.path) {
      console.log("request path intercepted for fix");

      // prepending "/" keeps query params, path params intact
      req.url = `/${req.url}`;
    }

    callback(req, res);
  };
};

export const getWebsiteUrl = () => {
  if (!functions.config().environment || !functions.config().environment.website_base_url)
    throw new Error("Website base URL is not configured");

  return functions.config().environment.website_base_url;
};

export enum LogLevel {
  Debug = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
}

async function logWithTimestampIfAboveThresholdAsync(
  applicationLevel: LogLevel,
  messageLevel: LogLevel,
  message: string,
  inspect?: any,
): Promise<void> {
  const timestampAtExecution = new Date(Date.now());

  return new Promise((resolve, reject) => {
    try {
      if (messageLevel >= applicationLevel) {
        const logString = timestampAtExecution.toString() + " " + messageLevel + ": " + message;

        switch (messageLevel) {
          case LogLevel.Warn:
            if (!!inspect) {
              console.warn(logString, inspect);
            } else {
              console.warn(logString);
            }
            break;
          case LogLevel.Error:
            if (!!inspect) {
              console.error(logString, inspect);
            } else {
              console.error(logString);
            }
            break;
          default:
            if (!!inspect) {
              console.log(logString, inspect);
            } else {
              console.log(logString);
            }
            break;
        }
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export const logWithTimestampIfAboveThreshold = (
  applicationLevel: LogLevel,
  messageLevel: LogLevel,
  message: string,
  inspect?: any,
) => {
  logWithTimestampIfAboveThresholdAsync(applicationLevel, messageLevel, message, inspect).catch((err) =>
    console.error(err),
  );
};

export const curryLogWithTimestamp = (applicationLevel: LogLevel) => {
  return (messageLevel: LogLevel, message: string, inspect?: any) => {
    logWithTimestampIfAboveThresholdAsync(applicationLevel, messageLevel, message, inspect).catch((err) =>
      console.error(err),
    );
  };
};

export function createLoggingMiddleware(log: (message: string, obj: any) => void) {
  return (req: express.Request, res: express.Response, next: () => void) => {
    log("Endpoint: ", req.url);
    log("Request Body", req.body);
    log("Request Query", req.query);
    next();
  };
}

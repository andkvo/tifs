import InstallationController from "../controllers/InstallationController";
import { aaCors } from "../../firebase-utils";
import * as express from "express";
import axios from "axios";
import { FirebaseSlackTeamRepository } from "../../models/firebase/FirebaseSlackTeamRepository";
import { FirebaseClientOrganizationRepository } from "../../models/firebase/FirebaseClientOrganizationRepository";
import { SlackWorkspaceSdk } from "../../models/slack/SlackWorkspaceSdk";
import { PubSub } from "@google-cloud/pubsub";

module.exports = function routes(config: any) {
  const app = express();

  app.use(aaCors);
  app.use(express.json());

  const c = new InstallationController();

  app.get("/info", async (req, res) => {
    const temporaryAccessCode = req.query.code;

    const { data: oauthResponse } = await axios.post(
      `https://slack.com/api/oauth.v2.access?client_id=${config.slack.app.client_id}&client_secret=${config.slack.app.client_secret}&code=${temporaryAccessCode}`,
    );

    /*
      {
        "ok": true,
        "app_id": "A02E3Q14PS4",
        "authed_user": {
          "id": "U0482K31H"
        },
        "scope": "chat:write,channels:join,users:read,commands",
        "token_type": "bot",
        "access_token": "xoxb-4274649035-2465970125046-GB8L1wJno2tYZMXj07uX3mDk",
        "bot_user_id": "U02DPUJ3P1C",
        "team": {
          "id": "T0482K311",
          "name": "Kvochick"
        },
        "enterprise": null,
        "is_enterprise_install": false
      }
    */

    // const firebaseInfo = {
    //   process_env: process.env,
    //   request: req,
    //   oauthResponse,
    // };

    console.log("Got OAuth Response", oauthResponse);

    // todo: error if team exists already - they already got a free trial

    const clientRepo = new FirebaseClientOrganizationRepository();

    const client = await clientRepo.create({
      organizationName: "",
      requestedAreaCode: "",
      primaryContactName: "",
      isAccountSuspended: false,
      minimumBalanceRequiredInTenths: 0,
      warningBalanceInTenths: 0,
      wasWarnedAboutBalance: false,
      stripeCustomerId: "",
      cecePhoneNumber: "",
      cecePhoneNumberTwilioSid: "",
      slackChannelId: "",
      smsCostInTenths: 100,
    });

    console.log("Created client", client);

    const teamRepo = new FirebaseSlackTeamRepository();
    const team = await teamRepo.create({
      id: oauthResponse.team.id,
      accessToken: oauthResponse.access_token,
      scope: oauthResponse.scope,
      name: oauthResponse.team.name,
      botUser: oauthResponse.bot_user_id,
      authedUserId: oauthResponse.authed_user.id,
      client,
    });

    console.log("Created team", team);

    const slack = new SlackWorkspaceSdk(team.accessToken);
    const conv = await slack.openConversation(team.authedUserId);

    console.log("Opened conversation", conv);

    const tosMessage = await slack.postMessage(
      conv.channel.id,

      (message) => {
        message.text = "Please accept the Terms and Conditions to begin your free trial."; // fallback for notifications

        message.blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: 'Hello, there! Thanks for trying TIFS Text It From Slack. By clicking "Accept" below, you are acknowledging that you have reviewed and agree to our Terms of Service, End User License Agreement, and Privacy Policy. If you do that, I can get your free trial started.',
            },
          },
          {
            type: "actions",
            block_id: "actionblock789",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Accept",
                },
                style: "primary",
                value: "accept_tos",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Uninstall",
                },
                value: "reject_tos",
              },
            ],
          },
        ];
      },
    );

    const pubsub = new PubSub();
    const dataBuffer = Buffer.from(JSON.stringify(client));
    const publishResponse = await pubsub.topic("begin-free-trial-slack").publish(dataBuffer);

    console.log("publish response", publishResponse);

    return res.json({ client, team, tosMessage });
  });

  app.get("/direct", c.directInstall.bind(c));
  app.get("/oauth-complete", c.oauthComplete.bind(c));

  return app;
};

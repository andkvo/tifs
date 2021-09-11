import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";
import { ISlackTeamRepository } from "../slack/ISlackTeamRepository";
import { SlackTeam } from "../slack/SlackTeam";

export class FirebaseSlackTeamRepository implements ISlackTeamRepository {
  create(slackTeam: SlackTeam & IIdentity): Promise<SlackTeam & IIdentity> {
    console.log("Saving new slackTeam...", slackTeam);
    return admin
      .firestore()
      .collection("slackTeams")
      .doc(slackTeam.id)
      .set(slackTeam)
      .then(() => {
        return slackTeam;
      });
  }
}

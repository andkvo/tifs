import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";
import { ISlackTeamRepository } from "../slack/ISlackTeamRepository";
import { SlackTeam } from "../slack/SlackTeam";
import { FirebaseClientOrganizationRepository } from "./FirebaseClientOrganizationRepository";

const COLLECTION_NAME = "slackTeams";

export class FirebaseSlackTeamRepository implements ISlackTeamRepository {
  create(slackTeam: SlackTeam & IIdentity): Promise<SlackTeam & IIdentity> {
    console.log("Saving new slackTeam...", slackTeam);
    return admin
      .firestore()
      .collection(COLLECTION_NAME)
      .doc(slackTeam.id)
      .set(slackTeam)
      .then(() => {
        return slackTeam;
      });
  }

  public static makeTeamFromDocumentData(data: any): SlackTeam & IIdentity {
    return {
      id: data.id,
      accessToken: data.accessToken,
      scope: data.scope,
      name: data.name,
      botUser: data.botUser,
      authedUserId: data.authedUserId,
      client: FirebaseClientOrganizationRepository.makeClientFromDocumentData(data.client.id, data.client),
    };
  }

  async get(teamId: string): Promise<(SlackTeam & IIdentity) | null> {
    const doc = await admin.firestore().collection(COLLECTION_NAME).doc(teamId).get();

    const data = doc.data();

    if (!data) return null;

    return FirebaseSlackTeamRepository.makeTeamFromDocumentData(data);
  }
}

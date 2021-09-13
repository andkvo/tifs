import { IClientOrganizationRepository } from "../clientOrganizations/IClientOrganizationRepository";
import { ClientOrganization } from "../clientOrganizations/ClientOrganization";
import * as admin from "firebase-admin";
import { IIdentity } from "../common/IIdentity";

export class FirebaseClientOrganizationRepository implements IClientOrganizationRepository {
  public static makeClientFromDocumentData(id: string, data: any): ClientOrganization & IIdentity {
    return {
      id,
      organizationName: data.organizationName,
      cecePhoneNumber: data.cecePhoneNumber,
      cecePhoneNumberTwilioSid: data.cecePhoneNumberTwilioSid,
      slackChannelId: data.slackChannelId,
      requestedAreaCode: data.requestedAreaCode,
      primaryContactName: data.primaryContactName,
      isAccountSuspended: data.isAccountSuspended,
      minimumBalanceRequiredInTenths: data.minimumBalanceRequiredInTenths,
      warningBalanceInTenths: data.warningBalanceInTenths,
      wasWarnedAboutBalance: data.wasWarnedAboutBalance,
      stripeCustomerId: data.stripeCustomerId,
    };
  }

  create(orgPrefs: ClientOrganization): Promise<ClientOrganization & IIdentity> {
    console.log("Saving new ClientOrganization...", orgPrefs);
    return admin
      .firestore()
      .collection("organizationPreferences")
      .add(orgPrefs)
      .then((doc) => {
        const savedOrgPrefs = <ClientOrganization & IIdentity>orgPrefs;
        savedOrgPrefs.id = doc.id;
        return savedOrgPrefs;
      });
  }

  find(uid: string): Promise<(ClientOrganization & IIdentity) | null> {
    return admin
      .firestore()
      .collection("organizationPreferences")
      .doc(uid)
      .get()
      .then((doc) => {
        const data = doc.data();
        if (!data) return null;
        return FirebaseClientOrganizationRepository.makeClientFromDocumentData(doc.id, data);
      });
  }

  save(orgPrefs: ClientOrganization & IIdentity): Promise<void> {
    if (!orgPrefs.id) {
      throw new Error("Cannot save org preferences without ID");
    }

    return admin
      .firestore()
      .collection("organizationPreferences")
      .doc(orgPrefs.id)
      .set(orgPrefs)
      .then(() => {
        return;
      });
  }

  lookupByOfficePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null> {
    return admin
      .firestore()
      .collection("organizationPreferences")
      .where("cecePhoneNumber", "==", phoneNumber)
      .get()
      .then((qs) => {
        let orgPrefs;

        qs.forEach((doc) => {
          orgPrefs = doc.data();
          if (orgPrefs) orgPrefs.id = doc.id;
        });

        return orgPrefs || null;
      });
  }

  lookupByClientMobilePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null> {
    return admin
      .firestore()
      .collection("organizationPreferences")
      .where("clientMobileNumber", "==", phoneNumber)
      .get()
      .then((qs) => {
        let orgPrefs;

        qs.forEach((doc) => {
          orgPrefs = doc.data();
          if (orgPrefs) orgPrefs.id = doc.id;
        });

        return orgPrefs || null;
      });
  }

  lookupBySlackChannelId(slackChannelId: string): Promise<(ClientOrganization & IIdentity) | null> {
    return admin
      .firestore()
      .collection("organizationPreferences")
      .where("slackChannelId", "==", slackChannelId)
      .get()
      .then((qs) => {
        let orgPrefs;

        qs.forEach((doc) => {
          orgPrefs = doc.data();
          if (orgPrefs) orgPrefs.id = doc.id;
        });

        return orgPrefs || null;
      });
  }
}

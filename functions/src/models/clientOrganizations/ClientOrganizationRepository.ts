import { IIdentity } from "../common/IIdentity";
import { IFormatPhoneNumbers } from "../common/IFormatPhoneNumbers";
import { IClientOrganizationRepository } from "./IClientOrganizationRepository";
import { ClientOrganization } from "./ClientOrganization";

export class ClientOrganizationRepository implements IClientOrganizationRepository {
  private phoneNumberFormatter: IFormatPhoneNumbers;
  private repo: IClientOrganizationRepository;

  constructor(repo: IClientOrganizationRepository, phoneNumberFormatter: IFormatPhoneNumbers) {
    this.phoneNumberFormatter = phoneNumberFormatter;
    this.repo = repo;
  }

  async add(orgPrefs: ClientOrganization): Promise<(ClientOrganization & IIdentity) | null> {
    orgPrefs.clientMobileNumber = this.phoneNumberFormatter.format(orgPrefs.clientMobileNumber);

    const existingClient = await this.repo.lookupByClientMobilePhoneNumber(orgPrefs.clientMobileNumber);

    if (existingClient) {
      throw new Error("Client mobile number is already registered");
    }

    return this.repo.add(orgPrefs);
  }

  find(uid: string): Promise<(ClientOrganization & IIdentity) | null> {
    return this.repo.find(uid);
  }

  save(orgPrefs: ClientOrganization & IIdentity): Promise<void> {
    return this.repo.save(orgPrefs);
  }

  lookupByOfficePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null> {
    return this.repo.lookupByOfficePhoneNumber(phoneNumber);
  }

  lookupByClientMobilePhoneNumber(phoneNumber: string): Promise<(ClientOrganization & IIdentity) | null> {
    const formattedNumber = this.phoneNumberFormatter.format(phoneNumber);
    return this.repo.lookupByClientMobilePhoneNumber(formattedNumber);
  }

  lookupBySlackChannelId(slackChannelId: string): Promise<(ClientOrganization & IIdentity) | null> {
    return this.repo.lookupBySlackChannelId(slackChannelId);
  }
}

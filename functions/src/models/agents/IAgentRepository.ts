import { Agent } from "./Agent";

export interface IAgentRepository {
  lookupAgentBySlackHandle(handle: string): Promise<Agent>;
}

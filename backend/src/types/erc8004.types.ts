/**
 * ERC-8004 Type Definitions
 * Compliant with https://eips.ethereum.org/EIPS/eip-8004#registration-v1
 */

/**
 * ERC-8004 Registration File (Token URI content)
 */
export interface ERC8004RegistrationFile {
  type: string;
  name: string;
  description: string;
  image?: string;
  endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
  }>;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  supportedTrust?: string[];
}

/**
 * Agent data for registration
 */
export interface AgentData {
  name: string;
  type: 'give' | 'want';
  description: string;
}

/**
 * Agent registration result
 */
export interface AgentRegistration {
  agentId: number;
  transactionId: string;
  tokenURI: string;
  ownerDid: string;
}

/**
 * Agent information from blockchain
 */
export interface AgentInfo {
  agentId: number;
  ownerAddress: string;
  ownerDid: string | null;
  tokenURI: string;
}

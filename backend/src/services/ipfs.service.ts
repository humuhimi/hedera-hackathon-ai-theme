/**
 * IPFS Service using Pinata
 * Uploads agent metadata for ERC-8004 Token URI
 */

import { PinataSDK } from 'pinata';

interface AgentMetadata {
  type: string;
  name: string;
  description: string;
  agentType: 'give' | 'want';
  endpoints: Array<{
    name: string;
    endpoint: string;
  }>;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
}

class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT must be set in .env');
    }
    this.pinata = new PinataSDK({ pinataJwt: jwt });
  }

  async uploadMetadata(metadata: AgentMetadata): Promise<string> {
    try {
      const file = new File(
        [JSON.stringify(metadata, null, 2)],
        'metadata.json',
        { type: 'application/json' }
      );

      console.log('📤 Uploading to IPFS via Pinata...');
      const result = await this.pinata.upload.file(file);
      const ipfsUri = `ipfs://${result.IpfsHash}`;

      console.log(`✅ IPFS upload successful: ${ipfsUri}`);
      return ipfsUri;
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw new Error(`Failed to upload metadata to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const ipfsService = new IPFSService();

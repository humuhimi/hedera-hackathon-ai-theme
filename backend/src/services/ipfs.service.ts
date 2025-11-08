/**
 * IPFS Service using Pinata
 * Uploads agent metadata for ERC-8004 Token URI
 */

import { PinataSDK } from 'pinata';
import type { ERC8004RegistrationFile } from '../types/erc8004.types.js';

class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT must be set in .env');
    }
    this.pinata = new PinataSDK({ pinataJwt: jwt });
  }

  async uploadMetadata(metadata: ERC8004RegistrationFile): Promise<string> {
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

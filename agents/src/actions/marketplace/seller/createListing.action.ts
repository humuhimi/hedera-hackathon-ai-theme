/**
 * CREATE_LISTING Action (Seller)
 * Allows seller agents to create marketplace listings
 */

import {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { marketplaceApi } from '../services/marketplaceApi';
import { paramExtractor } from '../services/paramExtractor';
import { ListingParams } from '../shared/types';

export const createListingAction: Action = {
  name: 'LIST_ITEM',
  similes: ['CREATE_LISTING', 'SELL_ITEM', 'CREATE_SALE', 'POST_LISTING'],
  description: 'Create a new listing on the Hedera Marketplace. Works in any language - the AI will understand and extract listing details (title, prices) automatically.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    // Language-independent: check if conversation is in progress or has numbers (price info)
    const isInProgress = (state as any)?.listingInProgress === true;
    const hasNumbers = /\d+/.test(message.content.text || '');
    const hasContent = (message.content.text || '').trim().length > 2;

    return hasContent && (isInProgress || hasNumbers);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🏪 LIST_ITEM ACTION HANDLER STARTED                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📝 User Message:', message.content.text);

    try {
      // Mark listing conversation as in progress
      if (state) {
        (state as any).listingInProgress = true;
      }

      // Try to extract basic parameters - if missing, AI will ask naturally
      const extraction = await paramExtractor.extractListingParams(message, runtime, state);

      if (extraction.missing.length > 0) {
        console.log('⚠️  Missing params:', extraction.missing.join(', '));
        console.log('✅ AI agent will handle this in conversation\n');
        return; // Let AI ask for missing info
      }

      // All params present - create the listing
      console.log('✅ All params present. Creating listing...\n');

      const result = await marketplaceApi.createListing(extraction.params as ListingParams);

      console.log('✅ Listing created!');
      console.log('   ID:', result.listingId);
      console.log('   TX:', result.transactionId);

      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL environment variable is required');
      }
      const listingUrl = `${process.env.FRONTEND_URL}/listing/${result.listingId}`;

      // Clear the in-progress flag after success
      if (state) {
        (state as any).listingInProgress = false;
      }

      await callback({
        text: `✅ Listing created!\n\n📦 ${extraction.params.title}\nID: ${result.listingId}\nPrice: ${extraction.params.basePrice}-${extraction.params.expectedPrice} HBAR\n\n🔗 ${listingUrl}`,
        action: 'CREATE_LISTING',
      });

      console.log('✅ Success!\n');
    } catch (error: any) {
      console.error('❌ Error:', error.message);

      // Clear the in-progress flag on error
      if (state) {
        (state as any).listingInProgress = false;
      }

      await callback({
        text: `❌ Failed: ${error.message}`,
        error: true,
      });
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'List my vintage camera for 50 HBAR' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Listing created! ID: 1, Price: 50 HBAR',
          action: 'CREATE_LISTING',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Sell my laptop, base price 100, expected 150 HBAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Listing created! ID: 2, Price: 100-150 HBAR',
          action: 'CREATE_LISTING',
        },
      },
    ],
  ],
};

/**
 * CREATE_BUY_REQUEST Action (Buyer)
 * Allows buyer agents to post what they want to buy
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
import { BuyRequestParams } from '../shared/types';

export const createBuyRequestAction: Action = {
  name: 'CREATE_BUY_REQUEST',
  similes: ['POST_BUY_REQUEST', 'WANT_TO_BUY', 'LOOKING_FOR', 'SEARCH_ITEM'],
  description: 'Create a buy request to post what you want to purchase. Works in any language - the AI will understand and extract request details (item, price range) automatically.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    // Language-independent: check if conversation is in progress or has numbers (price info)
    const isInProgress = (state as any)?.buyRequestInProgress === true;
    const hasNumbers = /\d+/.test(message.content.text || '');
    const hasContent = (message.content.text || '').trim().length > 2;

    return hasContent && (isInProgress || hasNumbers);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ) => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🛒 CREATE_BUY_REQUEST ACTION HANDLER STARTED      ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📝 User Message:', message.content.text);

    try {
      // Mark buy request conversation as in progress
      if (state) {
        (state as any).buyRequestInProgress = true;
      }

      // Try to extract parameters - if missing, AI will ask naturally
      const extraction = await paramExtractor.extractBuyRequestParams(message, runtime, state);

      if (extraction.missing.length > 0) {
        console.log('⚠️  Missing params:', extraction.missing.join(', '));
        console.log('✅ AI agent will handle this in conversation\n');
        return; // Let AI ask for missing info
      }

      // All params present - create the buy request
      console.log('✅ All params present. Creating buy request...\n');

      const result = await marketplaceApi.createBuyRequest(extraction.params as BuyRequestParams);

      console.log('✅ Buy request created!');
      console.log('   ID:', result.buyRequestId);
      console.log('   Title:', result.title);

      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL environment variable is required');
      }
      const buyRequestUrl = `${process.env.FRONTEND_URL}/buy-request/${result.buyRequestId}`;

      // Clear the in-progress flag after success
      if (state) {
        (state as any).buyRequestInProgress = false;
      }

      await callback({
        text: `✅ Buy request posted!

🛒 ${extraction.params.title}
Budget: ${extraction.params.minPrice}-${extraction.params.maxPrice} HBAR
ID: ${result.buyRequestId}

🔗 ${buyRequestUrl}

🔍 Searching for matching listings...`,
        action: 'CREATE_BUY_REQUEST',
      });

      console.log('✅ Success!\n');
    } catch (error: any) {
      console.error('❌ Error:', error.message);

      // Clear the in-progress flag on error
      if (state) {
        (state as any).buyRequestInProgress = false;
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
        content: { text: 'I want to buy a blue chair for 0.5 to 3 HBAR' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Buy request posted! Blue chair, Budget: 0.5-3 HBAR',
          action: 'CREATE_BUY_REQUEST',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: '青い椅子が欲しい、予算は50から100 HBAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ Buy request posted! 青い椅子, Budget: 50-100 HBAR',
          action: 'CREATE_BUY_REQUEST',
        },
      },
    ],
  ],
};

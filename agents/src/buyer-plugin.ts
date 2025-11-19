/**
 * Buyer Plugin - Provides marketplace buyer actions
 *
 * This plugin registers all buyer-related actions with the ElizaOS runtime.
 * Actions MUST be registered through plugins, not directly on Character objects.
 */

import { Plugin } from '@elizaos/core';
import { createBuyRequestAction } from './actions/marketplace/buyer';

export const buyerPlugin: Plugin = {
  name: 'buyer-marketplace-plugin',
  description: 'Marketplace buyer functionality - buy request creation and item search',
  actions: [
    createBuyRequestAction,
    // Add more buyer actions here as they are implemented:
    // searchListingsAction,
    // confirmInquiryAction,
  ],
};

export default buyerPlugin;

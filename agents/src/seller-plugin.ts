/**
 * Seller Plugin - Provides marketplace seller actions
 *
 * This plugin registers all seller-related actions with the ElizaOS runtime.
 * Actions MUST be registered through plugins, not directly on Character objects.
 */

import { Plugin } from '@elizaos/core';
import { createListingAction } from './actions/marketplace/seller';

export const sellerPlugin: Plugin = {
  name: 'seller-marketplace-plugin',
  description: 'Marketplace seller functionality - listing creation and management',
  actions: [
    createListingAction,
    // Add more seller actions here as they are implemented:
    // respondInquiryAction,
    // negotiatePriceAction,
    // updateListingAction,
    // markSoldAction,
  ],
};

export default sellerPlugin;

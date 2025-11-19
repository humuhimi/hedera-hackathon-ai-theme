/**
 * Marketplace API Service
 * Handles all HTTP communication with the backend marketplace API
 */

import {
  ListingParams,
  InquiryParams,
  ListingResult,
  InquiryResult,
  BuyRequestParams,
  BuyRequestResult,
  MarketplaceError,
} from '../shared/types';

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error('BACKEND_URL environment variable is required');
}

export class MarketplaceApiService {
  /**
   * Create a new listing on the marketplace
   */
  async createListing(params: ListingParams): Promise<ListingResult> {
    console.log('\n╭──────────────────────────────────────────────────────╮');
    console.log('│  🌐 MARKETPLACE API: createListing()                │');
    console.log('╰──────────────────────────────────────────────────────╯');
    console.log('🎯 Target URL:', `${BACKEND_URL}/api/marketplace/listings`);
    console.log('📤 Request method: POST');
    console.log('📦 Payload:', JSON.stringify({ ...params, privateKey: '***' }, null, 2), '\n');

    try {
      console.log('⏳ Sending HTTP request...');
      const response = await fetch(`${BACKEND_URL}/api/marketplace/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      console.log('📨 Response received:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   OK:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.log('❌ Backend returned error:', JSON.stringify(error, null, 2));
        throw this.createError(
          error.error || 'Failed to create listing',
          'CREATE_LISTING_FAILED',
          error
        );
      }

      const result = await response.json();
      console.log('✅ Success! Result:', JSON.stringify(result, null, 2), '\n');

      return result;
    } catch (error: any) {
      console.log('🔴 Error caught in createListing:');
      console.log('   Type:', error.constructor.name);
      console.log('   Message:', error.message);
      console.log('   Code:', error.code || 'N/A');
      console.log('');

      if (error.code) throw error; // Already a MarketplaceError
      throw this.createError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * Create an inquiry/offer on a listing
   */
  async createInquiry(params: InquiryParams): Promise<InquiryResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createError(
          error.error || 'Failed to create inquiry',
          'CREATE_INQUIRY_FAILED',
          error
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error.code) throw error; // Already a MarketplaceError
      throw this.createError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * Create a buy request (what buyer wants to purchase)
   */
  async createBuyRequest(params: BuyRequestParams): Promise<BuyRequestResult> {
    console.log('\n╭──────────────────────────────────────────────────────╮');
    console.log('│  🌐 MARKETPLACE API: createBuyRequest()             │');
    console.log('╰──────────────────────────────────────────────────────╯');
    console.log('🎯 Target URL:', `${BACKEND_URL}/api/marketplace/buy-requests`);
    console.log('📤 Request method: POST');
    console.log('📦 Payload:', JSON.stringify(params, null, 2), '\n');

    try {
      console.log('⏳ Sending HTTP request...');
      const response = await fetch(`${BACKEND_URL}/api/marketplace/buy-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      console.log('📨 Response received:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   OK:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.log('❌ Backend returned error:', JSON.stringify(error, null, 2));
        throw this.createError(
          error.error || 'Failed to create buy request',
          'CREATE_BUY_REQUEST_FAILED',
          error
        );
      }

      const result = await response.json();
      console.log('✅ Success! Result:', JSON.stringify(result, null, 2), '\n');

      return result;
    } catch (error: any) {
      console.log('🔴 Error caught in createBuyRequest:');
      console.log('   Type:', error.constructor.name);
      console.log('   Message:', error.message);
      console.log('   Code:', error.code || 'N/A');
      console.log('');

      if (error.code) throw error; // Already a MarketplaceError
      throw this.createError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * Create a typed error
   */
  private createError(
    message: string,
    code: string,
    details?: any
  ): MarketplaceError {
    const error = new Error(message) as MarketplaceError;
    error.code = code;
    error.details = details;
    return error;
  }
}

// Singleton instance
export const marketplaceApi = new MarketplaceApiService();

/**
 * Parameter Extractor Service
 * Extracts structured parameters from natural language messages
 * Uses OpenAI for language-independent extraction
 */

import { IAgentRuntime, Memory } from '@elizaos/core';
import { ListingParams, InquiryParams, ExtractedParams } from '../shared/types';
import { translator } from './translator';

export class ParamExtractorService {
  /**
   * Extract listing parameters using AI translation (language-independent)
   */
  async extractListingParams(
    message: Memory,
    runtime: IAgentRuntime,
    state?: any
  ): Promise<ExtractedParams<ListingParams>> {
    console.log('\n🔍 PARAM EXTRACTOR (AI-powered)');
    console.log('📝 Original:', message.content.text);

    const originalText = message.content.text || '';
    const conversationHistory = state?.text;

    // Use AI to extract structured info with conversation history (language-independent)
    const aiExtracted = await translator.extractListingInfo(originalText, conversationHistory);

    console.log('🤖 AI Extracted:', JSON.stringify(aiExtracted, null, 2));

    const sellerAgentId = this.getAgentId(runtime, 'seller');

    if (!process.env.HEDERA_MANAGER_ACCOUNT_ID || !process.env.HEDERA_MANAGER_PRIVATE_KEY) {
      throw new Error('HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY environment variables are required');
    }

    const params: Partial<ListingParams> = {
      sellerAgentId,
      title: aiExtracted.title,
      description: aiExtracted.description || aiExtracted.title,
      basePrice: aiExtracted.basePrice,
      expectedPrice: aiExtracted.expectedPrice,
      accountId: process.env.HEDERA_MANAGER_ACCOUNT_ID,
      privateKey: process.env.HEDERA_MANAGER_PRIVATE_KEY,
    };

    const missing = this.findMissingParams(params, [
      'title',
      'basePrice',
      'expectedPrice',
    ]);

    const confidence = this.calculateConfidence(params, missing);

    console.log('📊 Result:', missing.length ? `Missing: ${missing.join(', ')}` : '✅ Complete');
    console.log('');

    return {
      params,
      missing,
      confidence,
    };
  }

  /**
   * Extract inquiry parameters using AI (language-independent)
   */
  async extractInquiryParams(
    message: Memory,
    runtime: IAgentRuntime
  ): Promise<ExtractedParams<InquiryParams>> {
    const text = message.content.text || '';

    // Simple regex for listing ID and price (number-based, language-independent)
    const listingIdMatch = text.match(/\b(\d+)\b/);
    const listingId = listingIdMatch ? parseInt(listingIdMatch[1], 10) : undefined;

    const priceMatch = text.match(/(\d+(?:\.\d+)?)/);
    const offerPrice = priceMatch ? parseFloat(priceMatch[1]) : undefined;

    const buyerAgentId = this.getAgentId(runtime, 'buyer');

    if (!process.env.HEDERA_RECEIVER_ACCOUNT_ID || !process.env.HEDERA_RECEIVER_PRIVATE_KEY) {
      throw new Error('HEDERA_RECEIVER_ACCOUNT_ID and HEDERA_RECEIVER_PRIVATE_KEY environment variables are required');
    }

    const params: Partial<InquiryParams> = {
      buyerAgentId,
      listingId,
      offerPrice,
      message: text,
      accountId: process.env.HEDERA_RECEIVER_ACCOUNT_ID,
      privateKey: process.env.HEDERA_RECEIVER_PRIVATE_KEY,
    };

    const missing = this.findMissingParams(params, ['listingId', 'offerPrice']);

    return {
      params,
      missing,
      confidence: this.calculateConfidence(params, missing),
    };
  }

  /**
   * Get agent ID from runtime
   */
  private getAgentId(_runtime: IAgentRuntime, type: 'seller' | 'buyer'): number {
    // TODO: When ERC-8004 NFT is implemented, get from runtime.agentId
    // For now, use environment variable or default
    const envKey =
      type === 'seller' ? 'SELLER_AGENT_ID' : 'BUYER_AGENT_ID';
    return parseInt(process.env[envKey] || (type === 'seller' ? '1' : '2'), 10);
  }

  /**
   * Find missing required parameters
   */
  private findMissingParams<T>(
    params: Partial<T>,
    required: (keyof T)[]
  ): string[] {
    return required.filter((key) => {
      const value = params[key];
      return value === undefined || value === null || value === '';
    }) as string[];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence<T>(
    params: Partial<T>,
    missing: string[]
  ): number {
    const totalKeys = Object.keys(params).length;
    if (totalKeys === 0) return 0;

    const presentKeys = totalKeys - missing.length;
    return presentKeys / totalKeys;
  }
}

// Singleton instance
export const paramExtractor = new ParamExtractorService();

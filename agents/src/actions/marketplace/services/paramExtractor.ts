/**
 * Parameter Extractor Service
 * Extracts structured parameters from natural language messages
 * Uses OpenAI for language-independent extraction
 */

import { IAgentRuntime, Memory } from '@elizaos/core';
import { ListingParams, InquiryParams, BuyRequestParams, ExtractedParams } from '../shared/types';
import { translator } from './translator';

// Cache for resolved agent IDs (elizaAgentId -> erc8004AgentId)
const agentIdCache = new Map<string, number>();

// Validate required environment variables
const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error('BACKEND_URL environment variable is required');
}

export class ParamExtractorService {
  private backendUrl = BACKEND_URL;
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

    const sellerAgentId = await this.getAgentId(runtime, 'seller');

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

    const buyerAgentId = await this.getAgentId(runtime, 'buyer');

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
   * Extract buy request parameters using AI (language-independent)
   */
  async extractBuyRequestParams(
    message: Memory,
    runtime: IAgentRuntime,
    state?: any
  ): Promise<ExtractedParams<BuyRequestParams>> {
    console.log('\n🔍 PARAM EXTRACTOR (AI-powered) - BuyRequest');
    console.log('📝 Original:', message.content.text);

    const originalText = message.content.text || '';

    // Get recent conversation history from memory
    let conversationHistory = state?.text || '';

    // If not in state, try to get from runtime memory
    if (!conversationHistory && message.roomId) {
      try {
        const recentMemories = await runtime.messageManager.getMemories({
          roomId: message.roomId,
          count: 10,
          unique: false,
        });

        // Build conversation history from recent messages
        conversationHistory = recentMemories
          .map((m: any) => `${m.userId === message.userId ? 'User' : 'Agent'}: ${m.content?.text || ''}`)
          .join('\n');

        console.log('📜 Loaded conversation history from memory (last 10 messages)');
      } catch (error) {
        console.log('⚠️  Could not load conversation history:', error);
      }
    }

    // Use AI to extract structured info (reusing translator for buy requests)
    // BuyRequest uses same fields as Listing (title, description, basePrice as minPrice, expectedPrice as maxPrice)
    const aiExtracted = await translator.extractListingInfo(originalText, conversationHistory);

    console.log('🤖 AI Extracted:', JSON.stringify(aiExtracted, null, 2));

    const buyerAgentId = await this.getAgentId(runtime, 'buyer');

    const params: Partial<BuyRequestParams> = {
      buyerAgentId,
      title: aiExtracted.title,
      description: aiExtracted.description || aiExtracted.title,
      minPrice: aiExtracted.basePrice,
      maxPrice: aiExtracted.expectedPrice,
    };

    const missing = this.findMissingParams(params, [
      'title',
      'minPrice',
      'maxPrice',
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
   * Get agent ID from runtime by resolving elizaAgentId to erc8004AgentId
   * Calls backend API to get the on-chain ID for this agent
   */
  private async getAgentId(runtime: IAgentRuntime, _type: 'seller' | 'buyer'): Promise<number> {
    const elizaAgentId = runtime.agentId;

    // Check cache first
    if (agentIdCache.has(elizaAgentId)) {
      const cachedId = agentIdCache.get(elizaAgentId)!;
      console.log(`📋 Using cached erc8004AgentId: ${cachedId} for eliza: ${elizaAgentId}`);
      return cachedId;
    }

    // Call backend to resolve elizaAgentId -> erc8004AgentId
    try {
      console.log(`🔍 Resolving elizaAgentId: ${elizaAgentId} to erc8004AgentId...`);

      const response = await fetch(`${this.backendUrl}/agents/eliza/${elizaAgentId}/erc8004-id`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to resolve agent ID: ${errorText}`);
      }

      const data = await response.json() as { erc8004AgentId: number; type: string };
      const erc8004AgentId = data.erc8004AgentId;

      if (!erc8004AgentId) {
        throw new Error(`No erc8004AgentId found for elizaAgentId: ${elizaAgentId}`);
      }

      // Cache the result
      agentIdCache.set(elizaAgentId, erc8004AgentId);
      console.log(`✅ Resolved erc8004AgentId: ${erc8004AgentId} for eliza: ${elizaAgentId}`);

      return erc8004AgentId;
    } catch (error) {
      console.error(`❌ Error resolving agent ID:`, error);
      throw error;
    }
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

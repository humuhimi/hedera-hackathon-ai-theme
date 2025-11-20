/**
 * Semantic Search Service
 * Uses OpenAI to semantically match buy requests with listings
 */

import OpenAI from 'openai';

interface ListingInfo {
  listingId: string;
  sellerAgentId: number;
  title: string;
  description: string;
  basePrice: number;
  expectedPrice: number;
  status: string;
}

interface BuyRequestInfo {
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
}

interface MatchResult {
  listingId: string;
  score: number;
  reason: string;
}

class SemanticSearchService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    // Debug: Log key info
    console.log('🔑 SemanticSearchService API Key check:');
    console.log('   Length:', apiKey?.length);
    console.log('   Starts with:', apiKey?.substring(0, 20));
    console.log('   Ends with:', apiKey?.substring(apiKey.length - 20));
    console.log('   Contains "export"?', apiKey?.includes('export'));

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      console.warn('⚠️  SemanticSearchService: No OPENAI_API_KEY found');
    }
  }

  /**
   * Find matching listings for a buy request using AI semantic matching
   */
  async findMatchingListings(
    buyRequest: BuyRequestInfo,
    listings: ListingInfo[]
  ): Promise<MatchResult[]> {
    if (!this.openai) {
      console.warn('⚠️  OpenAI not configured, returning empty results');
      return [];
    }

    if (listings.length === 0) {
      return [];
    }

    try {
      // Format listings for AI
      const listingsText = listings.map((l, i) =>
        `[${i + 1}] ID: ${l.listingId}, Title: "${l.title}", Description: "${l.description}", Price: ${l.basePrice}-${l.expectedPrice} HBAR`
      ).join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a marketplace matching assistant. Your job is to find listings that semantically match a buyer's request.

IMPORTANT: Match based on MEANING, not exact words:
- "black and white table" matches "White and Black Desk and Chair Set" (same colors, similar furniture)
- "laptop" matches "MacBook" (same category)
- "desk chair" matches "office chair" (same type of item)

Return ONLY valid JSON array:
[
  {
    "listingId": "listing ID string",
    "score": confidence 0-100,
    "reason": "brief explanation why it matches"
  }
]

Rules:
- Include ALL listings that could reasonably match the request
- Score 80+ for strong semantic matches
- Score 50-79 for partial matches (similar category/type)
- Don't include listings with score below 50
- Consider price compatibility (listing price should be within buyer's budget)
- Return empty array [] if no matches found`,
          },
          {
            role: 'user',
            content: `Buyer Request:
Title: "${buyRequest.title}"
Description: "${buyRequest.description}"
Budget: ${buyRequest.minPrice}-${buyRequest.maxPrice} HBAR

Available Listings:
${listingsText}

Find all matching listings.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"matches":[]}';
      const parsed = JSON.parse(content);

      // Handle both array and object with matches key
      const matches: MatchResult[] = Array.isArray(parsed) ? parsed : (parsed.matches || []);

      console.log(`🔍 Semantic Search found ${matches.length} matching listings for "${buyRequest.title}"`);
      matches.forEach(m => {
        console.log(`   - Listing #${m.listingId}: ${m.score}% - ${m.reason}`);
      });

      return matches;
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Check if semantic search is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}

// Singleton instance
export const semanticSearch = new SemanticSearchService();

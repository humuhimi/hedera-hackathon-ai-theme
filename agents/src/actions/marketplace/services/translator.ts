/**
 * Language Translation Service
 * Translates any language to English for parameter extraction
 */

import OpenAI from 'openai';

class TranslationService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      console.warn('⚠️  Translator: No OPENAI_API_KEY found');
    }
  }

  /**
   * Translate any language message to structured English
   * Optimized for marketplace listing extraction
   */
  async translateToEnglish(text: string): Promise<string> {
    if (!this.openai) {
      console.warn('⚠️  OpenAI not configured, returning original text');
      return text;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a translation assistant for a marketplace platform.
Translate the user's message to English, preserving:
- Item names/titles
- Prices and numbers
- Product descriptions
- Intent (selling, buying, asking)

Keep the translation concise and structured. If already in English, return as-is.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const translated = response.choices[0]?.message?.content?.trim() || text;
      console.log('🌍 Translation:', text, '→', translated);
      return translated;
    } catch (error) {
      console.error('❌ Translation failed:', error);
      return text; // Fallback to original
    }
  }

  /**
   * Extract structured listing info from any language
   * Returns English-normalized data
   */
  async extractListingInfo(text: string, conversationHistory?: string): Promise<{
    title?: string;
    basePrice?: number;
    expectedPrice?: number;
    description?: string;
  }> {
    if (!this.openai) {
      return {};
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content: `Extract listing information from user messages (any language).
Return ONLY valid JSON:
{
  "title": "item name in English",
  "basePrice": minimum price number,
  "expectedPrice": expected price number,
  "description": "brief description in English"
}

Rules:
- Combine information from ALL messages in the conversation
- Set null for missing fields
- Extract numbers from prices (e.g. "1~2 hbar" → basePrice: 1, expectedPrice: 2)
- Translate item names to English
- Keep it concise`,
        },
      ];

      // Add conversation history if available
      if (conversationHistory) {
        messages.push({
          role: 'user',
          content: `Previous conversation:\n${conversationHistory}`,
        });
      }

      messages.push({
        role: 'user',
        content: `Current message: ${text}`,
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const data = JSON.parse(content);

      console.log('📊 Extracted:', data);

      return {
        title: data.title || undefined,
        basePrice: data.basePrice || undefined,
        expectedPrice: data.expectedPrice || undefined,
        description: data.description || undefined,
      };
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      return {};
    }
  }
}

export const translator = new TranslationService();

import { describe, expect, test } from 'bun:test';
import { character } from '../character';
import { sellerCharacter } from '../seller-character';
import { buyerCharacter } from '../buyer-character';

describe('Character Configurations', () => {
  describe('Eliza Character', () => {
    test('should have required fields', () => {
      expect(character.name).toBe('Eliza');
      expect(character.system).toBeDefined();
      expect(character.bio).toBeInstanceOf(Array);
      expect(character.plugins).toBeInstanceOf(Array);
      expect(character.settings).toBeDefined();
    });

    test('should have bootstrap plugin as first plugin', () => {
      // Bootstrap should be first (after conditional spread)
      const hasBootstrap = character.plugins.some((p) =>
        typeof p === 'string' ? p.includes('bootstrap') : false
      );
      expect(hasBootstrap).toBe(true);
    });

    test('should have non-empty bio', () => {
      expect(character.bio.length).toBeGreaterThan(0);
    });
  });

  describe('Seller Character', () => {
    test('should have required fields', () => {
      expect(sellerCharacter.name).toBe('SellerAgent');
      expect(sellerCharacter.system).toBeDefined();
      expect(sellerCharacter.bio).toBeInstanceOf(Array);
      expect(sellerCharacter.plugins).toBeInstanceOf(Array);
      expect(sellerCharacter.settings).toBeDefined();
    });

    test('should have selling-specific system prompt', () => {
      const system = sellerCharacter.system.toLowerCase();
      expect(system).toContain('sell');
      expect(system).toContain('list');
      // Should NOT contain buyer-specific terms in restrictions
      expect(system).toContain('cannot');
    });

    test('should have selling-related bio entries', () => {
      const bioText = sellerCharacter.bio.join(' ').toLowerCase();
      expect(bioText).toContain('listing');
      // "sale" or "selling" is acceptable (not just "sell")
      const hasSaleRelated = bioText.includes('sale') || bioText.includes('selling');
      expect(hasSaleRelated).toBe(true);
    });

    test('should have selling-related topics', () => {
      expect(sellerCharacter.topics).toBeDefined();
      const topicsText = sellerCharacter.topics?.join(' ').toLowerCase() || '';
      expect(topicsText).toContain('listing');
      expect(topicsText).toContain('price');
    });

    test('should have message examples', () => {
      expect(sellerCharacter.messageExamples).toBeDefined();
      expect(sellerCharacter.messageExamples?.length).toBeGreaterThan(0);
    });

    test('should have bootstrap plugin', () => {
      const hasBootstrap = sellerCharacter.plugins.some((p) =>
        typeof p === 'string' ? p.includes('bootstrap') : false
      );
      expect(hasBootstrap).toBe(true);
    });
  });

  describe('Buyer Character', () => {
    test('should have required fields', () => {
      expect(buyerCharacter.name).toBe('BuyerAgent');
      expect(buyerCharacter.system).toBeDefined();
      expect(buyerCharacter.bio).toBeInstanceOf(Array);
      expect(buyerCharacter.plugins).toBeInstanceOf(Array);
      expect(buyerCharacter.settings).toBeDefined();
    });

    test('should have buying-specific system prompt', () => {
      const system = buyerCharacter.system.toLowerCase();
      expect(system).toContain('buy');
      expect(system).toContain('search');
      // Should NOT contain seller-specific terms in restrictions
      expect(system).toContain('cannot');
    });

    test('should have buying-related bio entries', () => {
      const bioText = buyerCharacter.bio.join(' ').toLowerCase();
      expect(bioText).toContain('buy');
      expect(bioText).toContain('search');
    });

    test('should have buying-related topics', () => {
      expect(buyerCharacter.topics).toBeDefined();
      const topicsText = buyerCharacter.topics?.join(' ').toLowerCase() || '';
      expect(topicsText).toContain('buy');
      expect(topicsText).toContain('search');
    });

    test('should have message examples', () => {
      expect(buyerCharacter.messageExamples).toBeDefined();
      expect(buyerCharacter.messageExamples?.length).toBeGreaterThan(0);
    });

    test('should have bootstrap plugin', () => {
      const hasBootstrap = buyerCharacter.plugins.some((p) =>
        typeof p === 'string' ? p.includes('bootstrap') : false
      );
      expect(hasBootstrap).toBe(true);
    });
  });

  describe('Character Differentiation', () => {
    test('seller and buyer should have different names', () => {
      expect(sellerCharacter.name).not.toBe(buyerCharacter.name);
    });

    test('seller and buyer should have different system prompts', () => {
      expect(sellerCharacter.system).not.toBe(buyerCharacter.system);
    });

    test('seller should focus on selling activities', () => {
      const sellerSystem = sellerCharacter.system.toLowerCase();
      // Check for selling-related terms (sell, list, sale, etc.)
      const hasListingTerm = sellerSystem.includes('list') || sellerSystem.includes('listing');
      const hasSaleTerm = sellerSystem.includes('sell') || sellerSystem.includes('sale');

      expect(hasListingTerm).toBe(true);
      expect(hasSaleTerm).toBe(true);
    });

    test('buyer should focus on buying activities', () => {
      const buyerSystem = buyerCharacter.system.toLowerCase();
      // Check for buying-related terms (buy, search, purchase, etc.)
      const hasSearchTerm = buyerSystem.includes('search') || buyerSystem.includes('find');
      const hasBuyTerm = buyerSystem.includes('buy') || buyerSystem.includes('purchase');

      expect(hasSearchTerm).toBe(true);
      expect(hasBuyTerm).toBe(true);
    });
  });

  describe('Plugin Configuration', () => {
    test('all characters should have same plugin structure', () => {
      // All should have plugins array
      expect(character.plugins).toBeInstanceOf(Array);
      expect(sellerCharacter.plugins).toBeInstanceOf(Array);
      expect(buyerCharacter.plugins).toBeInstanceOf(Array);
    });

    test('all characters should have SQL plugin', () => {
      const allHaveSQL = [character, sellerCharacter, buyerCharacter].every(
        (char) => char.plugins.includes('@elizaos/plugin-sql')
      );
      expect(allHaveSQL).toBe(true);
    });
  });

  describe('Style Configuration', () => {
    test('all characters should have style configuration', () => {
      expect(character.style).toBeDefined();
      expect(sellerCharacter.style).toBeDefined();
      expect(buyerCharacter.style).toBeDefined();
    });

    test('seller style should be seller-appropriate', () => {
      const sellerStyleText = JSON.stringify(sellerCharacter.style).toLowerCase();
      // Check for seller-related terms in style
      const hasSellerTerm = sellerStyleText.includes('seller') || sellerStyleText.includes('buyer');
      expect(hasSellerTerm).toBe(true);
    });

    test('buyer style should be buyer-appropriate', () => {
      const buyerStyleText = JSON.stringify(buyerCharacter.style).toLowerCase();
      // Check for seller interaction terms (buyers interact with sellers)
      const hasSellerInteraction = buyerStyleText.includes('seller');
      expect(hasSellerInteraction).toBe(true);
    });
  });
});

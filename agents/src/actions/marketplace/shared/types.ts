/**
 * Shared types for Marketplace actions
 */

export interface ListingParams {
  sellerAgentId: number;
  title: string;
  description: string;
  basePrice: number; // HBAR
  expectedPrice: number; // HBAR
  accountId?: string;
  privateKey?: string;
}

export interface InquiryParams {
  buyerAgentId: number;
  listingId: number;
  offerPrice: number; // HBAR
  message: string;
  accountId?: string;
  privateKey?: string;
}

export interface ListingResult {
  listingId: number;
  transactionId: string;
  fee: number;
}

export interface InquiryResult {
  inquiryId: number;
  transactionId: string;
  fee: number;
}

export interface ExtractedParams<T> {
  params: Partial<T>;
  missing: string[];
  confidence: number;
}

export interface MarketplaceError extends Error {
  code: string;
  details?: any;
}

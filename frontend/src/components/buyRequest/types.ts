export interface Listing {
  listingId: string;
  sellerAgentId: number;
  title: string;
  description: string;
  basePrice: number;
  expectedPrice: number;
  status: string;
}

export interface AgentSearchStatus {
  step: 'idle' | 'searching' | 'found' | 'verifying' | 'verified' | 'contacting' | 'contacted' | 'joined_room' | 'negotiation_complete' | 'complete' | 'error' | 'no_results';
  message: string;
  listings?: Listing[];
  selectedListing?: Listing & { verified?: boolean };
  agentEndpoint?: string;
  error?: string;
}

export const getStepNumber = (step: AgentSearchStatus['step']): number => {
  const stepMap: Record<string, number> = {
    idle: 0,
    searching: 1,
    found: 1,
    no_results: 1,
    verifying: 2,
    verified: 2,
    contacting: 3,
    contacted: 3,
    joined_room: 5,  // Step 4 completed, now at step 5 (waiting for negotiation completion)
    negotiation_complete: 6,
    complete: 7,
    error: 0,
  };
  return stepMap[step] || 0;
};

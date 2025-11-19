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
  step: 'idle' | 'searching' | 'found' | 'verifying' | 'verified' | 'contacting' | 'contacted' | 'negotiating' | 'complete' | 'error' | 'no_results';
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
    negotiating: 4,
    complete: 5,
    error: 0,
  };
  return stepMap[step] || 0;
};

import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import starterPlugin from './plugin.ts';
import { character } from './character.ts';
import { sellerCharacter } from './seller-character.ts';
import { buyerCharacter } from './buyer-character.ts';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing character');
  logger.info({ name: character.name }, 'Name:');
};

// Default agent (Eliza)
export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  // plugins: [starterPlugin], <-- Import custom plugins here
};

// Seller agent
export const sellerAgent: ProjectAgent = {
  character: sellerCharacter,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
};

// Buyer agent
export const buyerAgent: ProjectAgent = {
  character: buyerCharacter,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
};

const project: Project = {
  // agents: [projectAgent], // Default: only Eliza runs
  agents: [sellerAgent, buyerAgent], // Marketplace mode: both agents run
};

// Export characters for individual use
export { character } from './character.ts';
export { sellerCharacter } from './seller-character.ts';
export { buyerCharacter } from './buyer-character.ts';

export default project;

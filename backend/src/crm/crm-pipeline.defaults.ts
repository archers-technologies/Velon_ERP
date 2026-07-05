export const DEFAULT_PIPELINE_NAME = 'General Sales';

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New', position: 0, probability: 10 },
  { name: 'Contacted', position: 1, probability: 20 },
  { name: 'Qualified', position: 2, probability: 40 },
  { name: 'Proposal', position: 3, probability: 60 },
  { name: 'Negotiation', position: 4, probability: 80 },
  { name: 'Won', position: 5, probability: 100 },
  { name: 'Lost', position: 6, probability: 0 },
] as const;

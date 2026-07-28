import { Anthropic } from '@anthropic-ai/sdk';

// Single shared client — creating one per request would exhaust DB connections.
export const anthropic = new Anthropic();

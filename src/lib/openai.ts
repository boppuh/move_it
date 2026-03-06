import OpenAI from 'openai';

// Key is validated at call time by the SDK; no module-level throw
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

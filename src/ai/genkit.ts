import {genkit} from 'genkit';
import {cohere} from '@genkit-ai/cohere';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    cohere({
      apiKey: process.env.COHERE_API_KEY,
    }),
    googleAI(),
  ],
  logLevel: 'silent',
  model: 'cohere/command-r',
});

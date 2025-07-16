import {genkit} from 'genkit';
import {cohere} from '@genkit-ai/cohere';

export const ai = genkit({
  plugins: [
    cohere({
      apiKey: process.env.COHERE_API_KEY,
    }),
  ],
  model: 'cohere/command-r',
});

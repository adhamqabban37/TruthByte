import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'silent',
  model: 'googleai/gemini-1.5-flash-latest',
});

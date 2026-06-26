import OpenAI from 'openai';

export const openai = new OpenAI({
  // Point this to your local Ollama server
  baseURL: 'http://localhost:11434/v1',
  // You can put anything here; the local model ignores it
  apiKey: 'not-needed', 
});

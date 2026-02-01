import { ChatGroq } from '@langchain/groq';
import dotenv from 'dotenv';

dotenv.config();

// Primary model for classification - needs structured JSON output
// Llama 4 Maverick has better instruction following and JSON support
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    temperature: 0.1, // Low temperature for consistent classification
    maxTokens: 1024,
});

// Fast model for generating explanations
// Llama 4 Scout - same family, faster for text generation
const fastLlm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.1,
    maxTokens: 512,
});

export { llm, fastLlm };

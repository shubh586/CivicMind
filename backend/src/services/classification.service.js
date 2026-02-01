import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { llm } from '../config/langchain.js';


class ClassificationService {
    constructor() {
        this.categories = [
            'sewage', 'drainage', 'water', 'electricity', 'streetlight',
            'road', 'pothole', 'garbage', 'cleanliness', 'health',
            'mosquito', 'disease', 'transport', 'traffic', 'pollution',
            'noise', 'tree', 'other'
        ];

        this.urgencyLevels = ['low', 'medium', 'high', 'critical'];
    }

   
    async classifyComplaint(complaintText) {
  
        const systemPrompt = `You are an expert civic complaint classification system for a municipal corporation. 
Your task is to analyze citizen complaints and extract structured information.

Available categories: ${this.categories.join(', ')}

Urgency levels:
- low: Minor inconvenience, can be addressed within normal SLA
- medium: Causes moderate disruption, needs attention within a few days
- high: Significant issue affecting daily life, needs priority attention
- critical: Public safety hazard, health emergency, or widespread impact requiring immediate action

Guidelines:
1. Extract the most specific category that matches the complaint
2. Identify any location mentioned (ward, area, street, landmark)
3. Assess urgency based on impact, safety concerns, and number of people affected
4. Summarize the core intent/request in a brief phrase
5. Provide a confidence score (0.0 to 1.0) for your classification

IMPORTANT: If the complaint is unclear, contains multiple issues, or you're unsure, give a lower confidence score (below 0.6).

Respond ONLY with valid JSON. Example format:
{{"category": "sewage", "urgency": "high", "location": "MG Road", "intent": "Fix sewage overflow", "confidence": 0.85, "reasoning": "Clear sewage issue mentioned"}}`;

        const humanPrompt = `Analyze and classify this citizen complaint:

"{complaint}"

Respond with JSON only.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', humanPrompt]
        ]);

        const parser = new JsonOutputParser();

        try {
            const chain = prompt.pipe(llm).pipe(parser);

            const result = await chain.invoke({
                complaint: complaintText
            });

            console.log('✅ LLM Classification result:', result);

            // Validate and normalize the result
            return this.normalizeClassification(result);

        } catch (error) {
            console.error('❌ Classification error:', error.message);

            // Return a low-confidence fallback
            return {
                category: 'other',
                urgency: 'medium',
                location: null,
                intent: 'Unable to classify automatically',
                confidence: 0.0,
                reasoning: `Classification failed: ${error.message}`,
                needsReview: true
            };
        }
    }

    /**
     * Normalize and validate classification result
     * @param {Object} result - Raw LLM classification
     * @returns {Object} - Normalized classification
     */
    normalizeClassification(result) {
        const normalized = {
            category: this.categories.includes(result.category) ? result.category : 'other',
            urgency: this.urgencyLevels.includes(result.urgency) ? result.urgency : 'medium',
            location: result.location || null,
            intent: result.intent || 'General complaint',
            confidence: Math.min(1, Math.max(0, parseFloat(result.confidence) || 0.5)),
            reasoning: result.reasoning || 'No reasoning provided'
        };

        // Flag for manual review if confidence is low
        normalized.needsReview = normalized.confidence < 0.6;

        return normalized;
    }


    async batchClassify(complaints) {
        const results = [];

        for (const complaint of complaints) {
            try {
                const classification = await this.classifyComplaint(complaint.text);
                results.push({
                    id: complaint.id,
                    text: complaint.text,
                    ...classification
                });

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                results.push({
                    id: complaint.id,
                    text: complaint.text,
                    category: 'other',
                    urgency: 'medium',
                    location: null,
                    intent: 'Classification failed',
                    confidence: 0.0,
                    needsReview: true,
                    error: error.message
                });
            }
        }

        return results;
    }
}

export default new ClassificationService();

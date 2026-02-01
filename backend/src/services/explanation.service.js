import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { fastLlm } from '../config/langchain.js';


class ExplanationService {

    async generateRoutingExplanation(params) {
        const { complaintText, category, urgency, location, department, confidence, routingRule } = params;

        const systemPrompt = `You are generating transparent, human-readable explanations for an AI-powered grievance routing system.
Your explanations should be:
1. Clear and understandable to citizens
2. Specific about WHY the routing decision was made
3. Concise (2-3 sentences max)
4. Professional and reassuring`;

        const humanPrompt = `Generate a brief explanation for this routing decision:

Complaint: "{complaint}"

Classification:
- Category: {category}
- Urgency: {urgency}
- Location: {location}
- Assigned Department: {department}
- Confidence Score: {confidence}%
- Routing Rule Applied: {rule}

Write a clear explanation of why this complaint was routed to this department.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', humanPrompt]
        ]);

        const parser = new StringOutputParser();

        try {
            const chain = prompt.pipe(fastLlm).pipe(parser);

            const explanation = await chain.invoke({
                complaint: complaintText.substring(0, 300), // Limit length
                category: category || 'unclassified',
                urgency: urgency || 'medium',
                location: location || 'not specified',
                department: department || 'General Administration',
                confidence: Math.round((confidence || 0.5) * 100),
                rule: routingRule || 'default routing'
            });

            return explanation.trim();

        } catch (error) {
            console.error('Explanation generation error:', error.message);
            return `Routed to ${department} based on complaint category (${category}) and urgency level (${urgency}).`;
        }
    }

    /**
     * Generate escalation explanation
     * @param {Object} params - Parameters for escalation explanation
     * @returns {Promise<string>} - Human-readable escalation justification
     */
    async generateEscalationExplanation(params) {
        const {
            complaintText,
            originalDepartment,
            escalatedTo,
            daysOverdue,
            originalSLA,
            complaintAge
        } = params;

        const systemPrompt = `You are generating transparent escalation justifications for a grievance management system.
The escalation has already occurred due to SLA breach. Your job is to explain:
1. Why the escalation was necessary
2. What the original SLA expectation was
3. How overdue the complaint is
4. What happens next

Keep explanations professional, objective, and under 3 sentences.`;

        const humanPrompt = `Generate an escalation justification:

Original Complaint: "{complaint}"
Original Department: {original_dept}
Escalated To: {escalated_to}
Original SLA: {sla} days
Total Complaint Age: {age} days
Days Overdue: {overdue} days

Write a clear justification for this escalation.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', humanPrompt]
        ]);

        const parser = new StringOutputParser();

        try {
            const chain = prompt.pipe(fastLlm).pipe(parser);

            const explanation = await chain.invoke({
                complaint: complaintText.substring(0, 300),
                original_dept: originalDepartment || 'Previous Department',
                escalated_to: escalatedTo || 'Senior Administration',
                sla: originalSLA || 7,
                age: complaintAge || 0,
                overdue: daysOverdue || 0
            });

            return explanation.trim();

        } catch (error) {
            console.error('Escalation explanation error:', error.message);
            return `This complaint has been escalated from ${originalDepartment} to ${escalatedTo} due to exceeding the ${originalSLA}-day SLA by ${daysOverdue} days. Immediate attention is required.`;
        }
    }


    async generateReviewFlagExplanation(params) {
        const { complaintText, confidence, category, reasoning } = params;

        const systemPrompt = `You are explaining why a complaint needs human review.
Be specific about what made the AI uncertain and what a human reviewer should look for.
Keep it brief (1-2 sentences).`;

        const humanPrompt = `Explain why this complaint needs manual review:

Complaint: "{complaint}"
AI Classification: {category}
Confidence: {confidence}%
AI Reasoning: {reasoning}

Why does this need human review?`;

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', humanPrompt]
        ]);

        const parser = new StringOutputParser();

        try {
            const chain = prompt.pipe(fastLlm).pipe(parser);

            const explanation = await chain.invoke({
                complaint: complaintText.substring(0, 300),
                category: category || 'uncertain',
                confidence: Math.round((confidence || 0) * 100),
                reasoning: reasoning || 'No reasoning available'
            });

            return explanation.trim();

        } catch (error) {
            console.error('Review flag explanation error:', error.message);
            return `Low confidence classification (${Math.round((confidence || 0) * 100)}%). Manual review recommended to ensure accurate routing.`;
        }
    }
}

export default new ExplanationService();

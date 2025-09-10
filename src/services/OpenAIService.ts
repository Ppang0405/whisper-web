interface FactCheckResult {
    claim: string;
    accuracy: 'accurate' | 'inaccurate' | 'uncertain' | 'needs_verification';
    confidence: number; // 0-100
    explanation: string;
    suggested_sources?: string[];
    category?: string;
}

interface FactCheckResponse {
    overall_assessment: {
        accuracy_score: number; // 0-100
        confidence_level: 'high' | 'medium' | 'low';
        summary: string;
    };
    claims: FactCheckResult[];
    verification_recommendations: string[];
    sources_recommended: string[];
}

interface SourceVerificationResult {
    url: string;
    credibility_score: number; // 0-100
    relevance_score: number; // 0-100
    content_match: string;
    fact_check_result: FactCheckResult;
}

class OpenAIService {
    private apiKey: string;
    private baseUrl: string = 'https://api.openai.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async factCheckSummary(
        summary: string, 
        originalTranscript: string,
        options: {
            model?: string;
            includeSourceVerification?: boolean;
            strictness?: 'low' | 'medium' | 'high';
        } = {}
    ): Promise<FactCheckResponse> {
        const {
            model = 'gpt-4-turbo-preview',
            includeSourceVerification = false,
            strictness = 'medium'
        } = options;

        const systemPrompt = this.createFactCheckSystemPrompt(strictness);
        const userPrompt = this.createFactCheckUserPrompt(summary, originalTranscript, includeSourceVerification);

        const response = await this.callOpenAI(model, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);

        return this.parseFactCheckResponse(response.choices[0].message.content);
    }

    async verifyClaimsAgainstSources(
        claims: string[],
        sources: string[]
    ): Promise<SourceVerificationResult[]> {
        const results: SourceVerificationResult[] = [];

        for (const claim of claims) {
            for (const source of sources) {
                try {
                    const result = await this.verifySingleClaimAgainstSource(claim, source);
                    results.push(result);
                } catch (error) {
                    console.error(`Error verifying claim against source:`, error);
                    results.push({
                        url: source,
                        credibility_score: 0,
                        relevance_score: 0,
                        content_match: 'Error: Unable to verify',
                        fact_check_result: {
                            claim,
                            accuracy: 'uncertain',
                            confidence: 0,
                            explanation: 'Unable to verify against this source'
                        }
                    });
                }
            }
        }

        return results;
    }

    private async verifySingleClaimAgainstSource(claim: string, sourceUrl: string): Promise<SourceVerificationResult> {
        // Note: This would require a web scraping service or API
        // For now, we'll simulate with OpenAI analysis
        const prompt = `
        Analyze this claim against the provided source URL:
        
        Claim: "${claim}"
        Source URL: ${sourceUrl}
        
        If you cannot access the URL, provide your best assessment based on the claim alone.
        Rate credibility (0-100), relevance (0-100), and provide a fact-check result.
        `;

        const response = await this.callOpenAI('gpt-4-turbo-preview', [
            { role: 'system', content: 'You are a fact-checking assistant that verifies claims against sources.' },
            { role: 'user', content: prompt }
        ]);

        return this.parseSourceVerificationResponse(response.choices[0].message.content, claim, sourceUrl);
    }

    private async callOpenAI(model: string, messages: Array<{ role: string; content: string }>) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.3, // Lower temperature for more factual responses
                max_tokens: 2000,
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private createFactCheckSystemPrompt(strictness: string): string {
        const basePrompt = `You are an expert fact-checking assistant. Your task is to analyze summaries and transcripts for factual accuracy.

Your analysis should:
1. Identify specific claims made in the summary
2. Assess the accuracy of each claim
3. Provide confidence levels for your assessments
4. Suggest verification methods when needed
5. Recommend reliable sources for further verification

Accuracy ratings:
- ACCURATE: Claim is factually correct based on available information
- INACCURATE: Claim is factually incorrect or misleading
- UNCERTAIN: Unable to verify claim with confidence
- NEEDS_VERIFICATION: Claim requires additional verification

Confidence scoring (0-100):
- 90-100: High confidence
- 70-89: Medium-high confidence  
- 50-69: Medium confidence
- 30-49: Low-medium confidence
- 0-29: Low confidence

Strictness level: ${(strictness as string).toUpperCase()}`;

        return basePrompt;
    }

    private createFactCheckUserPrompt(summary: string, transcript: string, includeSourceVerification: boolean): string {
        let prompt = `Please fact-check this summary against the original transcript:

SUMMARY:
${summary}

ORIGINAL TRANSCRIPT:
${transcript}

Please provide:
1. Overall assessment with accuracy score (0-100)
2. Analysis of individual claims
3. Confidence levels for each assessment
4. Recommendations for verification
5. Suggested reliable sources for further research`;

        if (includeSourceVerification) {
            prompt += `

6. Include specific source URLs for verification when possible`;
        }

        return prompt;
    }

    private parseFactCheckResponse(content: string): FactCheckResponse {
        // Parse the structured response from OpenAI
        // This is a simplified parser - in production, you'd want more robust parsing
        try {
            const lines = content.split('\n');
            const claims: FactCheckResult[] = [];
            let overallAssessment = {
                accuracy_score: 75,
                confidence_level: 'medium' as 'high' | 'medium' | 'low',
                summary: 'Analysis completed'
            };
            let currentClaim: Partial<FactCheckResult> = {};

            for (const line of lines) {
                const trimmed = line.trim();
                
                if (trimmed.toLowerCase().includes('overall accuracy:')) {
                    const match = trimmed.match(/(\d+)/);
                    if (match) {
                        overallAssessment.accuracy_score = parseInt(match[1]);
                    }
                } else if (trimmed.toLowerCase().includes('confidence:')) {
                    if (trimmed.toLowerCase().includes('high')) overallAssessment.confidence_level = 'high';
                    else if (trimmed.toLowerCase().includes('medium')) overallAssessment.confidence_level = 'medium';
                    else if (trimmed.toLowerCase().includes('low')) overallAssessment.confidence_level = 'low';
                } else if (trimmed.match(/^\d+\./)) {
                    // New claim
                    if (currentClaim.claim) {
                        claims.push(currentClaim as FactCheckResult);
                    }
                    currentClaim = {
                        claim: trimmed.replace(/^\d+\.\s*/, ''),
                        accuracy: 'uncertain',
                        confidence: 50,
                        explanation: ''
                    };
                } else if (trimmed.toLowerCase().includes('accuracy:')) {
                    if (trimmed.toLowerCase().includes('accurate')) currentClaim.accuracy = 'accurate';
                    else if (trimmed.toLowerCase().includes('inaccurate')) currentClaim.accuracy = 'inaccurate';
                    else if (trimmed.toLowerCase().includes('uncertain')) currentClaim.accuracy = 'uncertain';
                    else if (trimmed.toLowerCase().includes('needs verification')) currentClaim.accuracy = 'needs_verification';
                } else if (trimmed.toLowerCase().includes('confidence:')) {
                    const match = trimmed.match(/(\d+)/);
                    if (match) {
                        currentClaim.confidence = parseInt(match[1]);
                    }
                } else if (trimmed.toLowerCase().includes('explanation:')) {
                    currentClaim.explanation = trimmed.replace(/^explanation:\s*/i, '');
                }
            }

            if (currentClaim.claim) {
                claims.push(currentClaim as FactCheckResult);
            }

            return {
                overall_assessment: overallAssessment,
                claims,
                verification_recommendations: ['Review claims marked as inaccurate or needs verification'],
                sources_recommended: ['Wikipedia', 'Academic journals', 'Official sources']
            };
        } catch (error) {
            console.error('Error parsing fact-check response:', error);
            return {
                overall_assessment: {
                    accuracy_score: 75,
                    confidence_level: 'medium',
                    summary: 'Analysis completed with parsing limitations'
                },
                claims: [],
                verification_recommendations: ['Manual review recommended'],
                sources_recommended: ['Multiple sources recommended']
            };
        }
    }

    private parseSourceVerificationResponse(content: string, claim: string, sourceUrl: string): SourceVerificationResult {
        // Simplified parser for source verification responses
        return {
            url: sourceUrl,
            credibility_score: 75,
            relevance_score: 75,
            content_match: content,
            fact_check_result: {
                claim,
                accuracy: 'uncertain',
                confidence: 50,
                explanation: content
            }
        };
    }
}

export default OpenAIService;
export type { FactCheckResult, FactCheckResponse, SourceVerificationResult };
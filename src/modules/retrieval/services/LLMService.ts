import { env } from "../../../config/env";
import type { MergedCandidate } from "../types/retrieval.types";

export interface RerankCandidateInput {
  resumeId: string;
  snippet?: string;
  skills?: string[];
  sources?: string[];
}

export interface RerankResult {
  resumeId: string;
  rank: number;
  relevanceScore: number;
  reason: string;
}

export interface SummaryOptions {
  style?: "short" | "detailed";
  maxTokens?: number;
}

export interface ExtractedMetadata {
  name?: string;
  role?: string;
  company?: string;
  skills: string[];
  yearsExperience?: number;
}

export class LLMService {
  private async callGroqCompletion(
    prompt: string,
    maxTokens: number,
    structuredOutput = true
  ): Promise<string> {
    if (!env.groqApiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.groqModel,
          messages: [
            {
              role: "system",
              content: structuredOutput
                ? "You are a careful retrieval re-ranker. Return valid JSON only and never invent resume IDs that were not supplied."
                : "You are a careful resume assistant. Return only the requested grounded summary text. Do not return JSON, markdown, or commentary."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
            reasoning_effort: "low",
            max_completion_tokens: maxTokens
        })
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown network error";
      throw new Error(`Groq LLM request failed: network error - ${message}`);
    }

    if (!response.ok) {
      let details = "";
      try {
        const text = await response.text();
        if (text) {
          details = ` - ${text.slice(0, 300)}`;
        }
      } catch (_error) {
        // ignore body read failure and keep the status message
      }

      throw new Error(
        `Groq LLM request failed: ${response.status} ${response.statusText || "error"}${details}`
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content
          .map((part) => (typeof part.text === "string" ? part.text : ""))
          .join("")
          .trim()
      : typeof content === "string"
        ? content.trim()
        : "";

    if (!text) {
      throw new Error("Groq LLM response was empty");
    }

    return text;
  }

  async rerankCandidates(
    query: string,
    candidates: RerankCandidateInput[],
    topK: number = env.rerankDefaultTopN
  ): Promise<{ results: RerankResult[]; model: string }> {
    const validCandidates = candidates.filter(
      (candidate): candidate is RerankCandidateInput =>
        candidate && typeof candidate.resumeId === "string" && candidate.resumeId.trim().length > 0
    );

    if (validCandidates.length === 0) {
      throw new Error("At least one candidate is required for reranking");
    }

    const inputIds = new Set(validCandidates.map((candidate) => candidate.resumeId));
    const rerankTopK = Math.min(
      Math.max(1, Number.isFinite(topK) ? topK : env.rerankDefaultTopN),
      validCandidates.length
    );

    const prompt = `
Return ONLY valid JSON in this shape:
{
  "results": [
    { "resumeId": "string", "rank": 1, "relevanceScore": 0.95, "reason": "short explanation" }
  ]
}

Task: Re-rank the following candidates for this recruiter query.
Query: ${query}
Candidates:
${JSON.stringify(
  validCandidates.slice(0, rerankTopK * 5).map((candidate) => ({
    resumeId: candidate.resumeId,
    snippet: candidate.snippet ?? "",
    skills: candidate.skills ?? [],
    sources: candidate.sources ?? []
  })),
  null,
  2
)}

Rules:
- Only use the provided resumeIds.
- Return the top ${rerankTopK} candidates in rank order.
- Avoid inventing candidates.
- relevanceScore must be a number between 0 and 1.
`;

    const rawResponse = await this.callGroqCompletion(prompt, 500);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (_error) {
      throw new Error("LLM rerank response was invalid");
    }

    const results = Array.isArray((parsed as { results?: unknown }).results)
      ? ((parsed as { results: unknown[] }).results as unknown[])
      : [];

    if (results.length === 0) {
      throw new Error("LLM rerank response was invalid");
    }

    const normalized = results.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new Error("LLM rerank response was invalid");
      }

      const candidate = entry as Record<string, unknown>;
      const resumeId = candidate.resumeId;
      const rank = candidate.rank;
      const relevanceScore = candidate.relevanceScore;
      const reason = candidate.reason;

      if (typeof resumeId !== "string" || !inputIds.has(resumeId)) {
        throw new Error("LLM rerank response was invalid");
      }

      return {
        resumeId,
        rank: typeof rank === "number" && Number.isFinite(rank) ? rank : index + 1,
        relevanceScore:
          typeof relevanceScore === "number" && Number.isFinite(relevanceScore)
            ? Math.min(Math.max(relevanceScore, 0), 1)
            : 0,
        reason: typeof reason === "string" ? reason : ""
      } satisfies RerankResult;
    });

    normalized.sort((a, b) => a.rank - b.rank);

    return {
      results: normalized.slice(0, rerankTopK),
      model: env.groqModel
    };
  }

  async summarizeCandidateFit(
    query: string,
    candidate: Pick<MergedCandidate, "resumeId" | "snippet" | "skills" | "sources">,
    options: SummaryOptions = {}
  ): Promise<string> {
    const style = options.style ?? "short";
    const maxTokens = options.maxTokens ?? 150;
    const prompt = `
Summarize how well this candidate matches the recruiter query.
Style: ${style}
Query: ${query}
Candidate:
${JSON.stringify(
  {
    resumeId: candidate.resumeId,
    snippet: candidate.snippet ?? "",
    skills: candidate.skills ?? [],
    sources: candidate.sources ?? []
  },
  null,
  2
)}

Rules:
- Base the summary only on the supplied candidate information.
- Keep it grounded in the snippet and skills.
- Keep the response to roughly ${maxTokens} tokens.
- Return only the summary text.
`;

    const content = await this.callGroqCompletion(
      prompt,
      Math.min(Math.max(maxTokens * 2, 200), 800),
      false
    );
    return content.trim();
  }

  extractMetadata(rawText: string): ExtractedMetadata {
    const normalized = rawText.replace(/\r/g, "").trim();
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const name = lines.find((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 2 && !/[0-9]/.test(line) && !/skills|experience|summary|profile|about/i.test(line);
    }) ?? undefined;

    const role = lines.find((line) =>
      /architect|engineer|manager|lead|developer|analyst|consultant|specialist|director/i.test(line)
    ) ?? undefined;

    let company = lines.find((line) =>
      /inc|limited|private|pvt|solutions|technologies|systems|labs|software|corp|llc|company/i.test(line)
    ) ?? undefined;

    if (!company) {
      company = lines.find((line) => {
        const lower = line.toLowerCase();
        return (
          !/skills|experience|summary|profile|about|architect|engineer|manager|developer|analyst|lead|consultant|director/i.test(lower) &&
          !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(line) &&
          line.length > 2
        );
      });
    }

    const skillsMatch = normalized.match(/skills\s*[:\-]?\s*([^\n]+)/i);
    const skills = skillsMatch
      ? skillsMatch[1]
          .split(/[;,]/)
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      : [];

    const yearsExperienceMatch = normalized.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i);
    const yearsExperience = yearsExperienceMatch ? Number.parseInt(yearsExperienceMatch[1], 10) : undefined;

    return {
      name,
      role,
      company,
      skills,
      yearsExperience
    };
  }
}

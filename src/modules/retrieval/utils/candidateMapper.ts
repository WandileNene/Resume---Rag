import type { CandidateSnippet, MergedCandidate } from "../types/retrieval.types";

// Maximum characters of rawText included in a snippet.
// Keeps the LLM prompt size predictable regardless of resume length.
const RAW_TEXT_SNIPPET_LIMIT = 800;

/**
 * Build a size-controlled plain-text snippet from a full CandidateSnippet.
 *
 * Priority order for information:
 *  1. Structured fields (name, role, company, skills, experienceSummary)
 *  2. Truncated rawText as a fallback context window
 *
 * The resulting string is what the LLM re-ranker receives per candidate.
 * Keeping it short and structured reduces token usage and improves ranking quality.
 */
export function buildSnippet(candidate: CandidateSnippet): string {
	const lines: string[] = [];

	if (candidate.name) lines.push(`Name: ${candidate.name}`);
	if (candidate.role) lines.push(`Role: ${candidate.role}`);
	if (candidate.company) lines.push(`Company: ${candidate.company}`);
	if (candidate.skills.length > 0) {
		lines.push(`Skills: ${candidate.skills.join(", ")}`);
	}
	if (candidate.experienceSummary) {
		lines.push(`Summary: ${candidate.experienceSummary}`);
	}

	// Append truncated rawText only if structured fields are sparse
	const structuredPart = lines.join("\n");
	const rawTrimmed = candidate.rawText.trim();

	if (rawTrimmed.length > 0) {
		const allowedRaw = rawTrimmed.slice(0, RAW_TEXT_SNIPPET_LIMIT);
		const truncated = rawTrimmed.length > RAW_TEXT_SNIPPET_LIMIT
			? `${allowedRaw}…`
			: allowedRaw;
		lines.push(`Resume: ${truncated}`);
	}

	return structuredPart.length > 0 ? lines.join("\n") : rawTrimmed.slice(0, RAW_TEXT_SNIPPET_LIMIT);
}

/**
 * Attach a built snippet to an already-merged candidate.
 * Returns a new object — does not mutate the input.
 */
export function attachSnippet(
	merged: MergedCandidate,
	snippetSource: CandidateSnippet
): MergedCandidate {
	return {
		...merged,
		snippet: buildSnippet(snippetSource)
	};
}

import type { ParsedResume } from "../types/ingestion.types";

export class LLMParserNotConfiguredError extends Error {
	readonly code = "LLM_PARSER_NOT_CONFIGURED";

	constructor() {
		super("LLM resume parser is not configured");
	}
}

export const validateParsedResume = (value: unknown): value is ParsedResume => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	if (!Array.isArray(candidate.skills) || !candidate.skills.every((skill) => typeof skill === "string")) {
		return false;
	}

	const stringFields = [
		"name",
		"email",
		"phone",
		"location",
		"company",
		"role",
		"education",
		"experienceSummary"
	];

	if (stringFields.some((field) => candidate[field] !== undefined && typeof candidate[field] !== "string")) {
		return false;
	}

	if (
		(candidate.totalExperience !== undefined && typeof candidate.totalExperience !== "number") ||
		(candidate.relevantExperience !== undefined && typeof candidate.relevantExperience !== "number")
	) {
		return false;
	}

	if (
		candidate.jobTitles !== undefined &&
		(!Array.isArray(candidate.jobTitles) ||
			!candidate.jobTitles.every((title) => typeof title === "string"))
	) {
		return false;
	}

	return true;
};

export class LLMResumeParser {
	async parseResume(_rawText: string): Promise<ParsedResume> {
		throw new LLMParserNotConfiguredError();
	}
}
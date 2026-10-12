import { detectSkills } from "../../../config/skills";
import {
	EMAIL_REGEX,
	EXPERIENCE_REGEX,
	PHONE_REGEX
} from "../utils/regex";
import { cleanText } from "../utils/textCleaner";
import type { ParsedResume } from "../types/ingestion.types";

const ROLE_KEYWORDS = /\b(architect|engineer|developer|manager|analyst|designer|consultant|tester|administrator|scientist|specialist|lead|director|intern)\b/i;
const EDUCATION_REGEX = /\b(?:B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E|M\.?\s*E|MBA|Bachelor|Master|Ph\.?D)\b/i;
const COMPANY_REGEX = /\b(?:private limited|pvt\.?\s*ltd\.?|limited|llp|inc\.?|corporation|technologies|technology|software|solutions|systems|services|company)\b/i;
const SECTION_HEADER_REGEX = /^(resume|curriculum vitae|profile|summary|objective|experience|education|skills|work experience|professional experience|employment history|contact|projects|certifications|achievements|languages|interests|references|career objective)$/i;
const FIELD_LABEL_REGEX = /^(name|email|phone|mobile|tel|location|address|company|organization|role|title|designation|education|degree|experience|skills?)\s*[:\-]/i;
const NOISE_REGEX = /\b(curriculum vitae|resume|page \d+|linkedin|github|http|www\.)\b/i;

const KNOWN_SKILL_PHRASES = [
	"Selenium WebDriver",
	"Core Java",
	"REST Assured",
	"MCP (Model Context Protocol)"
] as const;

const containsPhrase = (text: string, phrase: string): boolean => {
	const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?<![\\p{L}\\p{N}_])${escapedPhrase}(?![\\p{L}\\p{N}_])`, "iu").test(text);
};

const extractSkills = (rawText: string): string[] => {
	const skills = new Map<string, number>();

	for (const phrase of KNOWN_SKILL_PHRASES) {
		const phraseIndex = rawText.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
		if (phraseIndex >= 0 && containsPhrase(rawText, phrase)) {
			skills.set(phrase, phraseIndex);
		}
	}

	for (const skill of detectSkills(rawText)) {
		if (!KNOWN_SKILL_PHRASES.some((phrase) => phrase.includes(skill))) {
			const skillIndex = rawText.toLocaleLowerCase().indexOf(skill.toLocaleLowerCase());
			if (skillIndex >= 0) {
				skills.set(skill, skillIndex);
			}
		}
	}

	return [...skills.entries()]
		.sort((first, second) => first[1] - second[1])
		.map(([skill]) => skill);
};

const isUsableLine = (line: string): boolean => {
	return Boolean(line) &&
		!EMAIL_REGEX.test(line) &&
		!PHONE_REGEX.test(line) &&
		!SECTION_HEADER_REGEX.test(line) &&
		!FIELD_LABEL_REGEX.test(line) &&
		!NOISE_REGEX.test(line) &&
		!/^[-|•·]+$/.test(line);
};

const removeFieldLabel = (line: string): string =>
	line.replace(FIELD_LABEL_REGEX, "").trim();

const findName = (lines: string[], role?: string, company?: string, education?: string): string | undefined => {
	const candidates = lines
		.map(removeFieldLabel)
		.filter(isUsableLine)
		.filter((line) => line !== role && line !== company && line !== education)
		.filter((line) => !ROLE_KEYWORDS.test(line))
		.filter((line) => !EDUCATION_REGEX.test(line))
		.filter((line) => !EXPERIENCE_REGEX.test(line))
		.filter((line) => !/[,:;|]/.test(line))
		.filter((line) => line.length >= 2 && line.length <= 80)
		.filter((line) => line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 6);

	return candidates[0];
};

const findBestLine = (lines: string[], matcher: RegExp, excludeEducation = true): string | undefined => {
	return lines
		.map(removeFieldLabel)
		.filter(isUsableLine)
		.filter((line) => !excludeEducation || !EDUCATION_REGEX.test(line))
		.filter((line) => matcher.test(line))
		.sort((first, second) => first.length - second.length)[0];
};

export class AlgorithmResumeParser {
	parseResume(rawText: string): ParsedResume {
		const normalizedText = cleanText(rawText);
		const lines = normalizedText.split("\n").map((line) => line.trim());
		const parsedResume: ParsedResume = {
			skills: extractSkills(normalizedText)
		};

		const email = normalizedText.match(EMAIL_REGEX)?.[0];
		const phone = normalizedText.match(PHONE_REGEX)?.[0];
		const experienceMatch = normalizedText.match(EXPERIENCE_REGEX);
		const role = findBestLine(lines, ROLE_KEYWORDS);
		const company = findBestLine(lines, COMPANY_REGEX);
		const education = findBestLine(lines, EDUCATION_REGEX, false);
		const name = findName(lines, role, company, education);

		if (name) parsedResume.name = name;
		if (email) parsedResume.email = email;
		if (phone) parsedResume.phone = phone;
		if (company) parsedResume.company = company;
		if (role) {
			parsedResume.role = role;
			parsedResume.jobTitles = [role];
		}
		if (education) parsedResume.education = education;
		if (experienceMatch?.[1]) parsedResume.totalExperience = Number(experienceMatch[1]);

		return parsedResume;
	}
}
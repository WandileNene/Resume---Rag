const CONTROL_CHARACTER_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const cleanText = (rawText: string): string => {
	return rawText
		.replace(CONTROL_CHARACTER_REGEX, "")
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.filter((line) => line !== "")
		.join("\n")
		.trim();
};
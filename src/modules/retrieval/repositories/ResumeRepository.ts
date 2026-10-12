import { ObjectId } from "mongodb";
import { getDatabase } from "../../../config/database";
import { env } from "../../../config/env";
import type {
	CandidateSnippet,
	RetrievalCandidate,
	RetrievalFilters
} from "../types/retrieval.types";

const candidateProjection = {
	rawText: 1,
	name: 1,
	role: 1,
	company: 1,
	skills: 1,
	jobTitles: 1,
	experienceSummary: 1,
	score: 1
} as const;

const profileProjection = {
	fileName: 1,
	rawText: 1,
	name: 1,
	email: 1,
	phone: 1,
	location: 1,
	company: 1,
	role: 1,
	education: 1,
	totalExperience: 1,
	relevantExperience: 1,
	skills: 1,
	jobTitles: 1,
	experienceSummary: 1,
	createdAt: 1
} as const;

const toCandidate = (document: Record<string, unknown>): RetrievalCandidate => ({
	resumeId: String(document._id),
	name: typeof document.name === "string" ? document.name : undefined,
	role: typeof document.role === "string" ? document.role : undefined,
	company: typeof document.company === "string" ? document.company : undefined,
	skills: Array.isArray(document.skills)
		? document.skills.filter((skill): skill is string => typeof skill === "string")
		: [],
	score: typeof document.score === "number" ? document.score : undefined
});

const buildExperienceFilter = (filters?: RetrievalFilters) =>
	filters?.minYearsExperience === undefined
		? {}
		: { totalExperience: { $gte: filters.minYearsExperience } };

export class ResumeRepository {
	async findProfileById(resumeId: string): Promise<Record<string, unknown> | null> {
		if (!ObjectId.isValid(resumeId)) {
			return null;
		}

		const database = await getDatabase();
		const document = await database.collection(env.collectionName).findOne(
			{ _id: new ObjectId(resumeId) },
			{ projection: profileProjection }
		);

		if (!document) {
			return null;
		}

		const { _id, ...profile } = document;

		return {
			_id: String(_id),
			...profile
		};
	}

	async findById(resumeId: string): Promise<CandidateSnippet | null> {
		const database = await getDatabase();
		const document = await database.collection(env.collectionName).findOne(
			{ _id: new ObjectId(resumeId) },
			{ projection: candidateProjection }
		);

		if (!document) {
			return null;
		}

		return {
			...toCandidate(document),
			rawText: typeof document.rawText === "string" ? document.rawText : "",
			experienceSummary:
				typeof document.experienceSummary === "string"
					? document.experienceSummary
					: undefined
		};
	}

	async searchBm25(
		query: string,
		topK: number,
		filters?: RetrievalFilters
	): Promise<RetrievalCandidate[]> {
		const database = await getDatabase();
		const documents = await database
			.collection(env.collectionName)
			.aggregate([
				{
					$search: {
						index: env.bm25IndexName,
						text: {
							query,
							path: [
								"rawText",
								"skills",
								"jobTitles",
								"experienceSummary",
								"role",
								"company"
							]
						}
					}
				},
				{ $match: buildExperienceFilter(filters) },
				{ $set: { score: { $meta: "searchScore" } } },
				{ $limit: topK },
				{ $project: candidateProjection }
			])
			.toArray();

		return documents.map(toCandidate);
	}

	async searchVector(
		queryEmbedding: number[],
		topK: number,
		filters?: RetrievalFilters
	): Promise<RetrievalCandidate[]> {
		const database = await getDatabase();
		const experienceFilter = buildExperienceFilter(filters);
		const pipeline: object[] = [
			{
				$vectorSearch: {
					index: env.vectorIndexName,
					path: "embedding",
					queryVector: queryEmbedding,
					// Fetch more candidates to compensate for post-filter shrinkage.
					// Atlas inline filter requires the field to be declared as a filter
					// type in the vector index definition; a $match stage is portable.
					numCandidates: Math.max(topK * 10, 100),
					limit: topK * 5
				}
			},
			{ $set: { score: { $meta: "vectorSearchScore" } } }
		];

		// Apply experience filter as a post-vector $match so it works regardless
		// of whether the Atlas vector index has a filter field configured.
		if (Object.keys(experienceFilter).length > 0) {
			pipeline.push({ $match: experienceFilter });
		}

		pipeline.push({ $limit: topK }, { $project: candidateProjection });

		const documents = await database
			.collection(env.collectionName)
			.aggregate(pipeline)
			.toArray();

		return documents.map(toCandidate);
	}
}
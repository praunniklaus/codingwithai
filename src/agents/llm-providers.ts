export interface JobMatchResult {
	score: number;
	reasoning: string;
}

export interface GeneratedCV {
	content: string;
	format: "markdown" | "text";
}

export interface CoverLetterResult {
	content: string;
	tone: string;
}

export interface ApplicationInsight {
	insight_type: string;
	description: string;
	metadata?: Record<string, unknown>;
}

export type LLMProvider = "openai" | "anthropic" | "grok";

export class LLMProviderManager {
	constructor(
		_privateOpenaiKey?: string,
		_privateAnthropicKey?: string,
		_privateGrokKey?: string
	) {}

	/**
	 * Lightweight job matching scorer.
	 * Uses simple heuristics so we don't block on LLM calls during agent runs.
	 */
	async scoreJobMatch(
		_provider: LLMProvider,
		_model: string,
		userProfile: any,
		job: any
	): Promise<JobMatchResult> {
		const userSkills = new Set(
			(userProfile?.skills || []).map((s: any) => s.skill_name?.toLowerCase()).filter(Boolean)
		);
		const requiredSkills: string[] = (job.required_skills || []).map((s: string) => s.toLowerCase());
		const preferredSkills: string[] = (job.preferred_skills || []).map((s: string) => s.toLowerCase());

		const requiredMatches = requiredSkills.filter((s) => userSkills.has(s));
		const preferredMatches = preferredSkills.filter((s) => userSkills.has(s));

		let score = 40;
		if (requiredSkills.length > 0) {
			const requiredPct = requiredMatches.length / requiredSkills.length;
			score += Math.round(requiredPct * 40); // up to +40 from required skills
		} else {
			score += 10; // slight bonus if no explicit requirements
		}

		if (preferredSkills.length > 0) {
			const preferredPct = preferredMatches.length / preferredSkills.length;
			score += Math.round(preferredPct * 15); // up to +15 from preferred skills
		}

		// Location nudge
		if (userProfile?.location && job.location) {
			const locMatch =
				userProfile.location.toLowerCase() === job.location.toLowerCase() ||
				job.location.toLowerCase().includes(userProfile.location.toLowerCase());
			if (locMatch) score += 5;
		}

		// Clamp to 10-95 to leave room for manual adjustments later
		score = Math.max(10, Math.min(95, score));

		const reasoningParts: string[] = [];
		if (requiredMatches.length) {
			reasoningParts.push(`Matches required: ${requiredMatches.join(", ")}`);
		}
		if (preferredMatches.length) {
			reasoningParts.push(`Matches preferred: ${preferredMatches.join(", ")}`);
		}
		if (userProfile?.location && job.location) {
			reasoningParts.push(`Location considered: ${job.location}`);
		}
		if (reasoningParts.length === 0) {
			reasoningParts.push("Minimal overlap detected; baseline score applied.");
		}

		return {
			score,
			reasoning: reasoningParts.join(" | "),
		};
	}

	/**
	 * Produce a concise, structured CV tailored to the role.
	 * Uses deterministic text so runs are fast and do not require API calls.
	 */
	async generateCV(
		_provider: LLMProvider,
		_model: string,
		userProfile: any,
		job: any
	): Promise<GeneratedCV> {
		const skills = (userProfile?.skills || []).map((s: any) => s.skill_name).join(", ");
		const experience = (userProfile?.experience || [])
			.slice(0, 2)
			.map((exp: any) => `- ${exp.title} at ${exp.company}`)
			.join("\n");

		const content = `# ${userProfile?.name || userProfile?.user_id || "Candidate"}
**Target Role:** ${job?.title || "Role"}
**Location:** ${userProfile?.location || "Flexible"}

## Skills
${skills || "See profile for details"}

## Experience
${experience || "- (add experience)"}\n`;

		return { content, format: "markdown" };
	}

	/**
	 * Produce a short cover letter with a chosen tone.
	 */
	async generateCoverLetter(
		_provider: LLMProvider,
		_model: string,
		userProfile: any,
		job: any,
		tone: string = "professional"
	): Promise<CoverLetterResult> {
		const introName = userProfile?.name || "Candidate";
		const role = job?.title || "the role";
		const company = job?.company || "your company";
		const skills = (userProfile?.skills || []).map((s: any) => s.skill_name).slice(0, 3).join(", ");

		const content = `${introName} - Cover Letter (${tone})

Dear Hiring Team,

I am excited to apply for ${role} at ${company}. My background includes ${skills || "relevant experience"} and aligns well with the role requirements. I focus on delivering results, collaborating effectively, and learning quickly.

Thank you for your consideration.
`;

		return { content, tone };
	}

	/**
	 * Create simple insights over a set of applications without external LLM calls.
	 */
	async analyzeApplications(
		_provider: LLMProvider,
		_model: string,
		applications: any[]
	): Promise<ApplicationInsight[]> {
		const total = applications.length;
		const byStatus: Record<string, number> = {};
		applications.forEach((app) => {
			byStatus[app.status] = (byStatus[app.status] || 0) + 1;
		});

		const topStatuses = Object.entries(byStatus)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([status, count]) => `${status}: ${count}`);

		return [
			{
				insight_type: "summary",
				description: `Tracking ${total} applications. Top statuses → ${topStatuses.join(", ") || "n/a"}.`,
				metadata: { total, by_status: byStatus },
			},
		];
	}
}

import { z } from "zod";

import {
	SearchError,
	type BricksetCredentials,
	type BricksetSet,
	type SetSearchQuery,
	type SetSearchResult,
} from "./set.types";

const BRICKSET_GET_SETS_URL = "https://brickset.com/api/v3.asmx/getSets";
const upstreamResultSchema = z.object({
	status: z.string(),
	matches: z.number().int().nonnegative().optional(),
	sets: z.array(z.object({}).passthrough()).optional(),
	message: z.string().optional(),
});

export type FetchLike = typeof fetch;

export class BricksetClient {
	public constructor(
		private readonly fetchImplementation: FetchLike = fetch,
		private readonly timeoutMs = 4_000,
	) {}

	public async getSets(
		credentials: BricksetCredentials,
		query: SetSearchQuery,
	): Promise<SetSearchResult> {
		const url = new URL(BRICKSET_GET_SETS_URL);
		url.searchParams.set("apiKey", credentials.apiKey);
		url.searchParams.set("userHash", credentials.userHash);
		url.searchParams.set(
			"params",
			JSON.stringify({
				query: query.query,
			}),
		);

		const signal = AbortSignal.timeout(this.timeoutMs);
		let response: Response;

		try {
			response = await this.fetchImplementation(url, { signal });
		} catch {
			throw new SearchError(
				"UPSTREAM_UNAVAILABLE",
				502,
				"El catálogo no está disponible en este momento.",
			);
		}

		if (response.status === 429) {
			throw new SearchError(
				"UPSTREAM_RATE_LIMITED",
				429,
				"El catálogo está temporalmente limitado. Intenta más tarde.",
			);
		}

		if (!response.ok) {
			throw new SearchError(
				"UPSTREAM_UNAVAILABLE",
				502,
				"El catálogo no está disponible en este momento.",
			);
		}

		let payload: unknown;
		try {
			payload = await response.json();
		} catch {
			throw new SearchError(
				"UPSTREAM_INVALID_RESPONSE",
				502,
				"El catálogo devolvió una respuesta inválida.",
			);
		}

		const parsed = upstreamResultSchema.safeParse(payload);
		if (!parsed.success) {
			throw new SearchError(
				"UPSTREAM_INVALID_RESPONSE",
				502,
				"El catálogo devolvió una respuesta inválida.",
			);
		}

		if (parsed.data.status !== "success") {
			if (parsed.data.message?.toLowerCase().includes("limit")) {
				throw new SearchError(
					"UPSTREAM_RATE_LIMITED",
					429,
					"El catálogo está temporalmente limitado. Intenta más tarde.",
				);
			}
			throw new SearchError(
				"UPSTREAM_UNAVAILABLE",
				502,
				"El catálogo no está disponible en este momento.",
			);
		}

		if (parsed.data.matches === undefined || parsed.data.sets === undefined) {
			throw new SearchError(
				"UPSTREAM_INVALID_RESPONSE",
				502,
				"El catálogo devolvió una respuesta inválida.",
			);
		}

		return {
			status: "success",
			matches: parsed.data.matches,
			sets: parsed.data.sets as BricksetSet[],
		};
	}
}

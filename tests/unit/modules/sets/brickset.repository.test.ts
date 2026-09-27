import { describe, expect, it } from "vitest";

import { BricksetClient, type FetchLike } from "../../../../src/modules/sets/brickset.client";
import { BricksetRepository } from "../../../../src/modules/sets/brickset.repository";
import type { BricksetCredentialsProvider } from "../../../../src/modules/sets/brickset-secret.provider";

const credentialsProvider: BricksetCredentialsProvider = {
  getCredentials: async () => ({ apiKey: "test-key", userHash: "test-hash" }),
};

function repositoryWith(fetchImplementation: FetchLike): BricksetRepository {
  return new BricksetRepository(credentialsProvider, new BricksetClient(fetchImplementation));
}

describe("BricksetRepository", () => {
	 it("envía apiKey, userHash y params con únicamente la consulta", async () => {
		let requestedUrl: URL | undefined;
		const repository = repositoryWith(async (input) => {
			requestedUrl = new URL(input.toString());
			return new Response(JSON.stringify({ status: "success", matches: 0, sets: [] }), {
				status: 200,
			});
		});

		await repository.search({ query: "10212", pageNumber: 2, pageSize: 10 });

		expect(requestedUrl?.searchParams.get("apiKey")).toBe("test-key");
		expect(requestedUrl?.searchParams.get("userHash")).toBe("test-hash");
		expect(requestedUrl?.searchParams.get("params")).toBe('{"query":"10212"}');
	});

  it("mapea el límite del proveedor sin propagar su mensaje", async () => {
    const repository = repositoryWith(async () => new Response(JSON.stringify({ status: "error", message: "API limit exceeded test-key" }), { status: 200 }));

    await expect(repository.search({ query: "10212", pageNumber: 1, pageSize: 20 })).rejects.toMatchObject({
      code: "UPSTREAM_RATE_LIMITED",
      statusCode: 429,
    });
  });

  it("mapea una carga malformada a error seguro", async () => {
    const repository = repositoryWith(async () => new Response("not-json", { status: 200 }));

    await expect(repository.search({ query: "10212", pageNumber: 1, pageSize: 20 })).rejects.toMatchObject({
      code: "UPSTREAM_INVALID_RESPONSE",
      statusCode: 502,
    });
  });

  it("mapea un timeout a indisponibilidad", async () => {
    const repository = repositoryWith(async () => Promise.reject(new DOMException("Aborted", "AbortError")));

    await expect(repository.search({ query: "10212", pageNumber: 1, pageSize: 20 })).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      statusCode: 502,
    });
  });
});

import { describe, expect, it } from "vitest";

import { handler } from "../../../src/handlers/hello";

describe("hello handler", () => {
  it("delega y devuelve una respuesta compatible con HTTP API v2", async () => {
    const response = await handler({} as never, {} as never, () => undefined);

    expect(response).toMatchObject({
      statusCode: 200,
      body: JSON.stringify({ message: "Hola mundo" }),
    });
  });
});


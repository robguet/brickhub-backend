import { describe, expect, it } from "vitest";

import { authenticatedUserFromEvent } from "../../../src/shared/authenticated-user";

describe("authenticatedUserFromEvent", () => {
  it("uses only the JWT sub claim", () => {
    const event = { requestContext: { authorizer: { jwt: { claims: { sub: "trusted" } } } } };
    expect(authenticatedUserFromEvent(event as never)).toEqual({ sub: "trusted" });
  });

  it("rejects missing claims", () => {
    expect(authenticatedUserFromEvent({ requestContext: {} } as never)).toBeUndefined();
  });
});

import type { APIGatewayProxyEventV2 } from "aws-lambda";

export interface AuthenticatedUser {
  sub: string;
}

export function authenticatedUserFromEvent(event: APIGatewayProxyEventV2): AuthenticatedUser | undefined {
  const context = event.requestContext as typeof event.requestContext & { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  const claims = context.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  return typeof sub === "string" && sub.trim().length > 0 ? { sub } : undefined;
}

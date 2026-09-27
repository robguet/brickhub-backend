import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function getHello(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      message: "Hola mundo",
    }),
  };
}


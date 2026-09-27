import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { z } from "zod";

import type { BricksetCredentials } from "./set.types";

const secretSchema = z.object({
  BRICKSET_API_KEY: z.string().trim().min(1),
  BRICKSET_USER_HASH: z.string().trim().min(1),
});

export interface BricksetCredentialsProvider {
  getCredentials(): Promise<BricksetCredentials>;
}

export class SecretsManagerBricksetCredentialsProvider implements BricksetCredentialsProvider {
  public constructor(
    private readonly secretArn = process.env.BRICKSET_SECRET_ARN,
  ) {}

  public async getCredentials(): Promise<BricksetCredentials> {
    if (!this.secretArn) {
      throw new Error("Brickset secret configuration is missing");
    }

    const secret = await getSecret<unknown>(this.secretArn, {
      transform: "json",
      maxAge: 300,
      throwOnMissing: true,
    });

    const parsedSecret = secretSchema.parse(secret);
    return {
      apiKey: parsedSecret.BRICKSET_API_KEY,
      userHash: parsedSecret.BRICKSET_USER_HASH,
    };
  }
}

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { z } from "zod";
import { boundedOperation } from "./shopping-deadline";
import { ShoppingError, type ScrapeDoCredentialsProvider, type ShoppingCredentials, type ShoppingDeadline } from "./shopping.types";

export interface SecretReader {
  send(command: GetSecretValueCommand, options: { abortSignal: AbortSignal }): Promise<{ SecretString?: string }>;
}
const secretSchema = z.object({ SCRAPE_DO_API_KEY: z.string().trim().min(1) });
export class SecretsManagerScrapeDoCredentialsProvider implements ScrapeDoCredentialsProvider {
  private cached?: { value: ShoppingCredentials; expiresAt: number };
  public constructor(
    private readonly secretArn = process.env.SCRAPE_DO_SECRET_ARN,
    private readonly client: SecretReader = new SecretsManagerClient({ maxAttempts: 1 }),
    private readonly now = Date.now,
  ) {}
  public async getCredentials(deadline: ShoppingDeadline): Promise<ShoppingCredentials> {
    if (!this.secretArn || deadline.signal.aborted || deadline.expiresAt <= Date.now()) throw new ShoppingError("INTERNAL_ERROR", 500);
    if (this.cached && this.cached.expiresAt > this.now()) return this.cached.value;
    try {
      return await boundedOperation(deadline.signal, Math.min(2000, deadline.expiresAt - Date.now()), async signal => {
        const response = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretArn }), { abortSignal: signal });
        if (signal.aborted) throw new ShoppingError("INTERNAL_ERROR", 500);
        const payload: unknown = JSON.parse(response.SecretString ?? "");
        const secret = secretSchema.parse(payload);
        const value = { apiKey: secret.SCRAPE_DO_API_KEY };
        this.cached = { value, expiresAt: this.now() + 300_000 };
        return value;
      }, new ShoppingError("INTERNAL_ERROR", 500));
    } catch { throw new ShoppingError("INTERNAL_ERROR", 500); }
  }
}

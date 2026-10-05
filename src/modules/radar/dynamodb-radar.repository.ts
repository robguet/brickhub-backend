import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactGetCommand, TransactWriteCommand, type TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { configSchema, postSchema, metadataSchema, contentSchema, videoSchema, releaseSchema, summarySchema, radarId } from "./radar.schemas";
import { feeds, type FeedQuery, type RadarRepository, type RadarWriteRepository, type RadarEntity, type Post, type RadarConfig } from "./radar.types";
import { radarTableName } from "./radar-config";
import { RadarError } from "./radar.http-response";
import { assertItemSize, itemSize } from "./radar-item-size";
const createClient = () => DynamoDBDocumentClient.from(new DynamoDBClient({ maxAttempts: 3 }), { marshallOptions: { removeUndefinedValues: true } });
const record = z.record(z.string(), z.unknown());
export class DynamoDbRadarRepository implements RadarRepository {
  public constructor(protected readonly client = createClient(), protected readonly table = radarTableName()) {}
  public async queryFeed(query: FeedQuery, signal: AbortSignal): Promise<{ items: Record<string, unknown>[]; lastSk?: string }> {
    let expression = "PK = :pk";
    const values: Record<string, unknown> = { ":pk": query.pk };
    if (query.lower && query.upper) { expression += " AND SK BETWEEN :lower AND :upper"; values[":lower"] = query.lower; values[":upper"] = query.upper; }
    else if (query.lower) { expression += " AND SK >= :lower"; values[":lower"] = query.lower; }
    else if (query.upper) { expression += " AND SK <= :upper"; values[":upper"] = query.upper; }
    const result = await this.client.send(new QueryCommand({
      TableName: this.table, KeyConditionExpression: expression, ExpressionAttributeValues: values,
      ConsistentRead: true, ScanIndexForward: query.ascending, Limit: query.limit,
      ...(query.lastSk ? { ExclusiveStartKey: { PK: query.pk, SK: query.lastSk } } : {}),
    }), { abortSignal: signal });
    let lastSk: string | undefined;
    if (result.LastEvaluatedKey) {
      const key = z.object({ PK: z.literal(query.pk), SK: z.string() }).parse(result.LastEvaluatedKey);
      lastSk = key.SK;
    }
    return { items: (result.Items ?? []).map(value => record.parse(value)), ...(lastSk ? { lastSk } : {}) };
  }
  public async getPost(slug: string, signal: AbortSignal): Promise<Post | undefined> {
    const lookup = await this.client.send(new GetCommand({ TableName: this.table, Key: { PK: `SLUG#${slug}`, SK: "LOOKUP" }, ConsistentRead: true }), { abortSignal: signal });
    if (!lookup.Item) return undefined;
    const { postId } = z.object({ postId: radarId }).parse(lookup.Item);
    const result = await this.client.send(new TransactGetCommand({ TransactItems: ["META", "CONTENT"].map(SK => ({ Get: { TableName: this.table, Key: { PK: `POST#${postId}`, SK } } })) }), { abortSignal: signal });
    const meta = result.Responses?.[0]?.Item;
    const detail = result.Responses?.[1]?.Item;
    if (!meta || !detail) throw new RadarError("INTERNAL_ERROR");
    const post = postSchema.parse({ meta, detail });
    if (post.meta.slug !== slug || post.meta.id !== postId) throw new RadarError("INTERNAL_ERROR");
    return post;
  }
  public async getConfig(signal: AbortSignal): Promise<RadarConfig | undefined> {
    const result = await this.client.send(new GetCommand({ TableName: this.table, Key: { PK: "RADAR#CONFIG", SK: "V1" }, ConsistentRead: true }), { abortSignal: signal });
    return result.Item ? configSchema.parse(result.Item) : undefined;
  }
}
export interface StoredItem extends Record<string, unknown> { PK: string; SK: string; }
export function entityKey(entity: RadarEntity): { PK: string; SK: string } {
  if (entity.kind === "config") return { PK: "RADAR#CONFIG", SK: "V1" };
  const id = entity.kind === "post" ? entity.value.meta.id : entity.value.id;
  return { PK: `${entity.kind.toUpperCase()}#${id}`, SK: "META" };
}
export function entityVersion(entity: RadarEntity): number { return entity.kind === "post" ? entity.value.meta.version : entity.value.version; }
export function entityHash(entity: RadarEntity): string { return entity.kind === "post" ? entity.value.meta.sourceHash : entity.value.sourceHash; }
export function entityItems(entity: RadarEntity): StoredItem[] {
  const key = entityKey(entity);
  if (entity.kind === "config") return [{ ...key, ...entity.value }];
  if (entity.kind === "post") {
    const { meta, detail } = postSchema.parse(entity.value);
    const items: StoredItem[] = [{ ...key, ...meta }, { PK: key.PK, SK: "CONTENT", ...detail }];
    if (meta.status === "published") {
      const summary = summarySchema.parse(meta);
      const groups = [feeds.posts, feeds.category(meta.category), ...(meta.featured ? [feeds.featured] : [])];
      for (const PK of groups) items.push({ PK, SK: `${meta.publishedSort}#${meta.id}`, ...summary });
    }
    return items;
  }
  if (entity.kind === "video") {
    const video = videoSchema.parse(entity.value);
    return [{ ...key, ...video }, ...(video.status === "published" ? [{ PK: feeds.videos, SK: `${video.publishedSort}#${video.id}`, ...video }] : [])];
  }
  const release = releaseSchema.parse(entity.value);
  return [{ ...key, ...release }, ...(release.editorialStatus === "published" ? [feeds.releases, feeds.month(release.releaseDate.slice(0, 7))].map(PK => ({ PK, SK: `${release.releaseDate}#${release.id}`, ...release })) : [])];
}
export function validateEntitySize(entity: RadarEntity): void {
  const items = entityItems(entity);
  for (const item of items) assertItemSize(item, item.SK === "CONTENT" ? 320 * 1024 : entity.kind === "config" ? 32 * 1024 : 16 * 1024);
  if (items.reduce((total, value) => total + itemSize(value), 0) > 1024 * 1024) throw new RadarError("VALIDATION_ERROR");
}
function reservation(entity: RadarEntity): StoredItem | undefined {
  if (entity.kind === "post") return { PK: `SLUG#${entity.value.meta.slug}`, SK: "LOOKUP", postId: entity.value.meta.id };
  if (entity.kind === "release") return { PK: `RELEASE_UNIQUE#${entity.value.market}#${entity.value.setNumber}#${entity.value.releaseDate}`, SK: "LOOKUP", entityId: entity.value.id };
  return undefined;
}
const keyString = (value: { PK: string; SK: string }) => `${value.PK}\u0000${value.SK}`;
export class DynamoDbRadarWriter implements RadarWriteRepository {
  public constructor(private readonly client = createClient(), private readonly table = radarTableName()) {}
  public async getEntity(entity: RadarEntity): Promise<RadarEntity | undefined> {
    const key = entityKey(entity);
    const signal = AbortSignal.timeout(15_000);
    if (entity.kind === "post") {
      const result = await this.client.send(new TransactGetCommand({ TransactItems: ["META", "CONTENT"].map(SK => ({ Get: { TableName: this.table, Key: { PK: key.PK, SK } } })) }), { abortSignal: signal });
      const meta = result.Responses?.[0]?.Item;
      const detail = result.Responses?.[1]?.Item;
      if (!meta && !detail) return undefined;
      return { kind: "post", value: postSchema.parse({ meta, detail }) };
    }
    const result = await this.client.send(new GetCommand({ TableName: this.table, Key: key, ConsistentRead: true }), { abortSignal: signal });
    if (!result.Item) return undefined;
    if (entity.kind === "config") return { kind: "config", value: configSchema.parse(result.Item) };
    if (entity.kind === "video") return { kind: "video", value: videoSchema.parse(result.Item) };
    return { kind: "release", value: releaseSchema.parse(result.Item) };
  }
  public async checkReservations(entity: RadarEntity): Promise<void> {
    const item = reservation(entity);
    if (!item) return;
    const result = await this.client.send(new GetCommand({ TableName: this.table, Key: { PK: item.PK, SK: item.SK }, ConsistentRead: true }), { abortSignal: AbortSignal.timeout(15_000) });
    if (result.Item && (entity.kind === "post" ? result.Item.postId !== item.postId : result.Item.entityId !== item.entityId)) throw new RadarError("CONFLICT");
  }
  public async write(entity: RadarEntity, previous: RadarEntity | undefined): Promise<void> {
    validateEntitySize(entity);
    if (entityVersion(entity) !== (previous ? entityVersion(previous) + 1 : 1)) throw new RadarError("CONFLICT");
    if (previous?.kind === "post" && entity.kind === "post" && previous.value.meta.slug !== entity.value.meta.slug) throw new RadarError("CONFLICT");
    const key = entityKey(entity);
    const items = entityItems(entity);
    const oldItems = previous ? entityItems(previous) : [];
    type Action = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];
    const actions: Action[] = items.map(Item => ({ Put: {
      TableName: this.table, Item,
      ...(keyString(Item) === keyString(key) ? previous ? {
        ConditionExpression: "#version = :version", ExpressionAttributeNames: { "#version": "version" }, ExpressionAttributeValues: { ":version": entityVersion(previous) },
      } : { ConditionExpression: "attribute_not_exists(PK)" } : {}),
    } }));
    const nextKeys = new Set(items.map(keyString));
    for (const old of oldItems) {
      if (!nextKeys.has(keyString(old))) actions.push({ Delete: { TableName: this.table, Key: { PK: old.PK, SK: old.SK } } });
    }
    const nextReservation = reservation(entity);
    const oldReservation = previous ? reservation(previous) : undefined;
    if (nextReservation) {
      const field = entity.kind === "post" ? "postId" : "entityId";
      actions.push({ Put: { TableName: this.table, Item: nextReservation, ConditionExpression: `attribute_not_exists(PK) OR ${field} = :id`, ExpressionAttributeValues: { ":id": nextReservation[field] } } });
      if (oldReservation && oldReservation.PK !== nextReservation.PK) actions.push({ Delete: { TableName: this.table, Key: { PK: oldReservation.PK, SK: oldReservation.SK }, ConditionExpression: `${field} = :id`, ExpressionAttributeValues: { ":id": oldReservation[field] } } });
    }
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: actions }), { abortSignal: AbortSignal.timeout(15_000) });
    } catch (error) {
      if (error instanceof Error && error.name === "TransactionCanceledException") {
        const reasons = "CancellationReasons" in error ? error.CancellationReasons : undefined;
        if (Array.isArray(reasons) && reasons.some(value => value !== null && typeof value === "object" && "Code" in value && value.Code === "ConditionalCheckFailed")) throw new RadarError("CONFLICT");
      }
      throw error;
    }
  }
}
// These schemas intentionally remain the sole source of validation for DB input.
export { metadataSchema, contentSchema };

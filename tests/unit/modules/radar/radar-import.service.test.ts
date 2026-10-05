import { expect, it, vi } from "vitest";
import { prepared } from "../../../fixtures/radar/import-helper";
import { applyImport } from "../../../../src/modules/radar/radar-import.service";
import { entityKey } from "../../../../src/modules/radar/dynamodb-radar.repository";
import type { RadarEntity, RadarWriteRepository } from "../../../../src/modules/radar/radar.types";
function store(): RadarWriteRepository {
  const records = new Map<string, RadarEntity>();
  return { getEntity: async entity => records.get(entityKey(entity).PK), checkReservations: async () => {}, write: async entity => { records.set(entityKey(entity).PK, entity); } };
}
it("is repeatable without duplicates or overwriting an edited version", async () => {
  const writer = store(); const first = await applyImport(prepared(), writer); expect(first.appliedResults.every(result => result.action === "created")).toBe(true);
  const second = await applyImport(prepared(), writer); expect(second.appliedResults.every(result => result.action === "unchanged")).toBe(true);
  const changed = prepared(["tie-interceptor-review"]);
  expect((await applyImport(changed, writer)).conflicts).not.toHaveLength(0);
});
it("preflights all versions before media upload or any entity write", async () => {
  const writer = store(); await applyImport(prepared(), writer);
  const changes = prepared(["tie-interceptor-review"]); const write = vi.spyOn(writer, "write"); const upload = vi.fn();
  const result = await applyImport(changes, writer, upload);
  expect(result.importReady).toBe(false); expect(write).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
});
it("permits a selected version update and reports a partial write failure for safe retry", async () => {
  const writer = store(); await applyImport(prepared(), writer);
  const update = prepared(["tie-interceptor-review"]); update.manifest.expectedVersions["POST#tie-interceptor-review"] = 1;
  const result = await applyImport(update, writer); expect(result.importReady).toBe(true);
  expect(result.appliedResults.find(value => value.entityId === "POST#tie-interceptor-review")?.action).toBe("updated");
  const fail = store(); const write = fail.write; let count = 0;
  fail.write = async (entity, prev) => { if (++count === 2) throw new Error("AWS offline"); await write(entity, prev); };
  const partial = await applyImport(prepared(), fail); expect(partial.importReady).toBe(false); expect(partial.appliedResults.map(value => value.action)).toEqual(["created", "failed"]);
});

import { expect, it, vi } from "vitest";
import { RadarService, todayInMexico } from "../../../../src/modules/radar/radar.service";
import { repository } from "../../../fixtures/radar/helpers";
import { encodeCursor } from "../../../../src/modules/radar/radar.cursor";
it("uses ascending month feed and never infers availability from the clock", async () => {
  const queryFeed = vi.fn().mockResolvedValue({ items: [] });
  await new RadarService(repository({ queryFeed })).execute({ kind: "releases", month: "2026-08", limit: 3 });
  expect(queryFeed.mock.calls[0]?.[0]).toMatchObject({ pk: "FEED#RELEASES#MX#2026-08", ascending: true, lower: "2026-08-01#", upper: "2026-08-31#~", limit: 3 });
});
it("keeps the initial from-date when continuing after local midnight", async () => {
  const queryFeed = vi.fn().mockResolvedValue({ items: [] });
  const cursor = encodeCursor({ kind: "releases", mode: "upcoming", from: "2026-10-05", limit: 20, direction: "asc" }, "2026-10-10#event")!;
  await new RadarService(repository({ queryFeed }), () => new Date("2026-10-07T00:00:00Z")).execute({ kind: "releases", cursor, limit: 20 });
  expect(queryFeed.mock.calls[0]?.[0].lower).toBe("2026-10-05#");
  expect(todayInMexico(new Date("2026-10-06T03:00:00Z"))).toBe("2026-10-05");
});

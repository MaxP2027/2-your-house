import { describe, it, expect } from "vitest";
import { marketplaceActionSchema as schema } from "../../src/lib/marketplace-validation";
const id = "20000000-0000-4000-8000-000000000001";
describe("marketplace input boundary", () => {
  it("rejects impersonated senders", () =>
    expect(
      schema.safeParse({
        action: "message",
        conversation_id: id,
        body: "Hello",
        sender_id: id,
      }).success,
    ).toBe(false));
  it.each(["", " ".repeat(5), "a".repeat(2001)])(
    "rejects invalid message body",
    (body) =>
      expect(
        schema.safeParse({ action: "message", conversation_id: id, body })
          .success,
      ).toBe(false),
  );
  it("rejects reversed slot dates", () =>
    expect(
      schema.safeParse({
        action: "addSlot",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
      }).success,
    ).toBe(false));
  it("rejects invalid coordinates", () =>
    expect(
      schema.safeParse({
        action: "request",
        slot_id: id,
        description: "Heating is not working",
        address: "123 Test Lane",
        latitude: 91,
        longitude: 20,
      }).success,
    ).toBe(false));
  it("accepts a valid private request", () =>
    expect(
      schema.safeParse({
        action: "request",
        slot_id: id,
        description: "Heating is not working",
        address: "123 Test Lane",
        latitude: 41.8,
        longitude: -87.6,
      }).success,
    ).toBe(true));
});

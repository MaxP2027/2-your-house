import { z } from "zod";

const uuid = z.string().uuid("Choose a valid record.");
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const timestamp = z
  .string()
  .datetime({ offset: true, message: "Enter a valid appointment time." });
export const marketplaceActionSchema = z
  .discriminatedUnion("action", [
    z
      .object({
        action: z.literal("saveProfile"),
        display_name: text(1, 100),
        city: text(1, 100),
        bio: text(0, 1000),
        services: text(1, 500),
        accepting_requests: z.boolean(),
      })
      .strict(),
    z
      .object({
        action: z.literal("addSlot"),
        starts_at: timestamp,
        ends_at: timestamp,
      })
      .strict(),
    z.object({ action: z.literal("removeSlot"), slot_id: uuid }).strict(),
    z
      .object({
        action: z.literal("request"),
        slot_id: uuid,
        description: text(10, 2000),
        address: text(5, 300),
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
      })
      .strict(),
    z
      .object({
        action: z.literal("requestAction"),
        request_id: uuid,
        status: z.enum(["accepted", "declined", "cancelled", "completed"]),
      })
      .strict(),
    z
      .object({ action: z.literal("conversation"), technician_id: uuid })
      .strict(),
    z
      .object({
        action: z.literal("message"),
        conversation_id: uuid,
        body: text(1, 2000),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (value.action !== "addSlot") return;
    const start = Date.parse(value.starts_at),
      end = Date.parse(value.ends_at);
    if (
      start <= Date.now() ||
      start > Date.now() + 366 * 86400000 ||
      end <= start ||
      end - start > 8 * 3600000
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["starts_at"],
        message:
          "Choose a future slot within one year, lasting no more than eight hours.",
      });
    }
  });
export type MarketplaceAction = z.infer<typeof marketplaceActionSchema>;

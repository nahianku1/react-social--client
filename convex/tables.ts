import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  message: defineTable({
    from: v.string(),
    to: v.string(),
    email: v.string(),
    name: v.string(),
    content: v.string(),
    isFile: v.optional(v.boolean()),
    fileName: v.optional(v.string()),
    meta: v.optional(
      v.object({
        size: v.number(),
        type: v.string(),
      })
    ),
  }),
  notification: defineTable({
    caller: v.string(),
    time: v.string(),
    callee: v.string(),
  }),
});

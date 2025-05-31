import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  message: defineTable({
    from: v.string(),
    to: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }),
});

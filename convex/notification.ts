import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const insertNotification = mutation({
  args: {
    caller: v.string(),
    time: v.string(),
    callee: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notification", {
      caller: args.caller,
      time: args.time,
      callee: args.callee,
    });
  },
});

export const getNotification = query({
  args: {
    callee: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notification")
      .filter((q) => q.eq(q.field("callee"), args.callee))
      .order("asc")
      .collect();
  },
});

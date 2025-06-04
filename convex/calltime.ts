import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const insertCallTime = mutation({
  args: {
    duration: v.string(),
    caller: v.string(),
    callee: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("calltime", {
      duration: args.duration,
      caller: args.caller,
      callee: args.callee,
    });
    return id;
  },
});

export const getCallDuration = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("calltime").order("asc").collect();
  },
});

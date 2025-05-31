import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const insertMessage = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("message", {
      from: args.from,
      to: args.to,
      text: args.text,
      createdAt: new Date(),
    });
  },
});

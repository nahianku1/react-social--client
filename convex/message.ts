import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";

export const insertMessage = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    email: v.string(),
    name: v.string(),
    content: v.union(v.string(), v.array(v.bytes())),
    isFile: v.optional(v.boolean()),
    fileName: v.optional(v.string()),
    meta: v.optional(
      v.object({
        size: v.number(),
        type: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const url = await ctx.scheduler.runAfter(0, internal.message.fileUpload, {
      file: args.content instanceof Array ? args.content : [],
    });

    await ctx.db.insert("message", {
      from: args.from,
      to: args.to,
      email: args.email,
      name: args.name,
      content: url,
      isFile: args.isFile || false,
      fileName: args.fileName || null,
      meta: args.meta || null,
    });
  },
});

export const fileUpload = internalAction({
  args: {
    file: v.array(v.bytes()),
  },
  async handler(ctx, args) {
    // Convert ArrayBuffer to Uint8Array and flatten
    const uint8Arrays = args.file.map((arrBuf) => new Uint8Array(arrBuf));
    const totalLength = uint8Arrays.reduce((acc, arr) => acc + arr.length, 0);
    const flat = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of uint8Arrays) {
      flat.set(arr, offset);
      offset += arr.length;
    }
    const storageId = await ctx.storage.store(new Blob([flat]));
    return await ctx.storage.getUrl(storageId);
  },
});

export const getMessages = query({
  args: {
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Fetching messages between", args.from, "and", args.to);

    return await ctx.db
      .query("message")
      .filter((q) =>
        q.or(
          q.and(q.eq(q.field("from"), args.from), q.eq(q.field("to"), args.to)),
          q.and(q.eq(q.field("from"), args.to), q.eq(q.field("to"), args.from))
        )
      )
      .order("asc")
      .collect();
  },
});

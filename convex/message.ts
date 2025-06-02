import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "../convex/_generated/api";

// Insert message mutation (handles text or file)
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
    let content: string;

    if (args.isFile) {
      // Upload file and get public URL
      content = await ctx.scheduler.runAfter(0, internal.message.fileUpload, {
        file: args.content as ArrayBuffer[],
      });
    } else {
      // Plain text message
      content = args.content as string;
    }

    // Store message in DB
    await ctx.db.insert("message", {
      from: args.from,
      to: args.to,
      email: args.email,
      name: args.name,
      content,
      isFile: args.isFile || false,
      fileName: args.fileName || null,
      meta: args.meta || null,
    });
  },
});

// Internal action to store file in Convex and get public URL
export const fileUpload = internalAction({
  args: {
    file: v.array(v.bytes()), // ArrayBuffer[]
  },
  async handler(ctx, args) {
    const blob = new Blob(args.file);
    const storageId = await ctx.storage.store(blob);
    const fileUrl = await ctx.storage.getUrl(storageId);

    console.log("Storage ID:", storageId);
    console.log("File URL:", fileUrl); // 👈 log what you’re returning

    return fileUrl;
  },
});

// Query to get all messages between two users
export const getMessages = query({
  args: {
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
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

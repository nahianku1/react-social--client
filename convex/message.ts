/* eslint-disable @typescript-eslint/no-unused-vars */
import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Storage } from "megajs";
import { internal } from "../convex/_generated/api";

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
    await ctx.scheduler.runAfter(0, internal.message.fileUpload, {
      file: args.content as ArrayBuffer[],
      name: args.fileName as string,
    });
    await ctx.db.insert("message", {
      from: args.from,
      to: args.to,
      email: args.email,
      name: args.name,
      content: args.content,
      isFile: args.isFile || false,
      fileName: args.fileName || null,
      meta: args.meta || null,
    });
  },
});

export const fileUpload = internalAction({
  args: {
    file: v.array(v.bytes()),
    name: v.string(),
  },
  async handler(ctx, args) {
    const storage = new Storage({
      email: "nahianku1@gmail.com",
      password: "#!/bin/bashAdmin123",
    });

    storage.on("ready", async () => {
      const fileContent = await storage.upload(
        args.name,
        Buffer.concat(args.file.map((ab) => Buffer.from(ab)))
      ).complete;
      console.log("The file was uploaded!", fileContent);
    });
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

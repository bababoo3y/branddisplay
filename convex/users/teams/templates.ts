import { v } from "convex/values";
import { mutation, query } from "../../functions";
import { viewerHasPermission, viewerWithPermissionX } from "../../permissions";

export const generateUploadUrl = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    await viewerWithPermissionX(ctx, teamId, "Manage Team");
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (
      ctx.viewer === null ||
      !(await viewerHasPermission(ctx, teamId, "Contribute"))
    ) {
      return [];
    }
    const templates = await ctx.table("teams").getX(teamId).edge("templates");
    return await Promise.all(
      templates
        .slice()
        .reverse()
        .map(async (template) => ({
          _id: template._id,
          _creationTime: template._creationTime,
          name: template.name,
          thumbnailUrl: await ctx.storage.getUrl(template.thumbnailStorageId),
          pdfUrl:
            template.pdfStorageId === undefined
              ? null
              : await ctx.storage.getUrl(template.pdfStorageId),
          pngUrl:
            template.pngStorageId === undefined
              ? null
              : await ctx.storage.getUrl(template.pngStorageId),
        }))
    );
  },
});

export const create = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    thumbnailStorageId: v.id("_storage"),
    pdfStorageId: v.optional(v.id("_storage")),
    pngStorageId: v.optional(v.id("_storage")),
  },
  handler: async (
    ctx,
    { teamId, name, thumbnailStorageId, pdfStorageId, pngStorageId }
  ) => {
    await viewerWithPermissionX(ctx, teamId, "Manage Team");
    if (name.trim().length === 0) {
      throw new Error("Template name must not be empty");
    }
    await ctx.table("templates").insert({
      teamId,
      name,
      thumbnailStorageId,
      pdfStorageId,
      pngStorageId,
    });
  },
});

export const remove = mutation({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx, { templateId }) => {
    const template = await ctx.table("templates").getX(templateId);
    await viewerWithPermissionX(ctx, template.teamId, "Manage Team");
    await template.delete();
  },
});

export const accessForTemplate = query({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx, { templateId }) => {
    const template = await ctx.table("templates").getX(templateId);
    if (!(await viewerHasPermission(ctx, template.teamId, "Manage Team"))) {
      return [];
    }
    return (await template.edge("members")).map((member) => member._id);
  },
});

export const setAccess = mutation({
  args: {
    templateId: v.id("templates"),
    memberId: v.id("members"),
    hasAccess: v.boolean(),
  },
  handler: async (ctx, { templateId, memberId, hasAccess }) => {
    const template = await ctx.table("templates").getX(templateId);
    await viewerWithPermissionX(ctx, template.teamId, "Manage Team");
    const member = await ctx.table("members").getX(memberId);
    if (member.teamId !== template.teamId) {
      throw new Error("Member does not belong to this template's team");
    }
    await template.patch({
      members: hasAccess ? { add: [memberId] } : { remove: [memberId] },
    });
  },
});

export const myTemplates = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (ctx.viewer === null) {
      return [];
    }
    const member = await ctx
      .table("members", "teamUser", (q) =>
        q.eq("teamId", teamId).eq("userId", ctx.viewerX()._id)
      )
      .unique();
    if (member === null || member.deletionTime !== undefined) {
      return [];
    }
    const templates = await member.edge("templates");
    return await Promise.all(
      templates.map(async (template) => ({
        _id: template._id,
        name: template.name,
        thumbnailUrl: await ctx.storage.getUrl(template.thumbnailStorageId),
      }))
    );
  },
});

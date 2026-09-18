import { v } from "convex/values";
import { mutation, query } from "../../functions";
import { viewerHasPermission, viewerWithPermissionX } from "../../permissions";

export const get = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (
      ctx.viewer === null ||
      !(await viewerHasPermission(ctx, teamId, "Contribute"))
    ) {
      return null;
    }
    const team = await ctx.table("teams").getX(teamId);
    return {
      billingCompany: team.billingCompany ?? "",
      billingAddress1: team.billingAddress1 ?? "",
      billingAddress2: team.billingAddress2 ?? "",
      billingCity: team.billingCity ?? "",
      billingRegion: team.billingRegion ?? "",
      billingZip: team.billingZip ?? "",
      billingCountry: team.billingCountry ?? "",
      billingPhone: team.billingPhone ?? "",
    };
  },
});

export const set = mutation({
  args: {
    teamId: v.id("teams"),
    billingCompany: v.string(),
    billingAddress1: v.string(),
    billingAddress2: v.optional(v.string()),
    billingCity: v.string(),
    billingRegion: v.optional(v.string()),
    billingZip: v.string(),
    billingCountry: v.string(),
    billingPhone: v.optional(v.string()),
  },
  handler: async (ctx, { teamId, ...billing }) => {
    await viewerWithPermissionX(ctx, teamId, "Manage Team");
    await ctx.table("teams").getX(teamId).patch(billing);
  },
});

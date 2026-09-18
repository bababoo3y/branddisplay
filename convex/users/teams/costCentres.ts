import { v } from "convex/values";
import { mutation, query } from "../../functions";
import { viewerHasPermission, viewerWithPermissionX } from "../../permissions";

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
    const costCentres = await ctx
      .table("teams")
      .getX(teamId)
      .edge("costCentres");
    return costCentres.map((costCentre) => ({
      _id: costCentre._id,
      name: costCentre.name,
      address1: costCentre.address1,
      address2: costCentre.address2 ?? null,
      city: costCentre.city,
      region: costCentre.region ?? null,
      zip: costCentre.zip,
      country: costCentre.country,
      phone: costCentre.phone ?? null,
    }));
  },
});

export const create = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    address1: v.string(),
    address2: v.optional(v.string()),
    city: v.string(),
    region: v.optional(v.string()),
    zip: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { teamId, ...address }) => {
    await viewerWithPermissionX(ctx, teamId, "Manage Team");
    if (address.name.trim().length === 0) {
      throw new Error("Cost centre name must not be empty");
    }
    await ctx.table("costCentres").insert({ teamId, ...address });
  },
});

export const remove = mutation({
  args: {
    costCentreId: v.id("costCentres"),
  },
  handler: async (ctx, { costCentreId }) => {
    const costCentre = await ctx.table("costCentres").getX(costCentreId);
    await viewerWithPermissionX(ctx, costCentre.teamId, "Manage Team");
    await costCentre.delete();
  },
});

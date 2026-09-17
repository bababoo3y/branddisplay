import { v } from "convex/values";
import { mutation, query } from "../../functions";
import { viewerHasPermission, viewerWithPermissionX } from "../../permissions";

export const create = mutation({
  args: {
    teamId: v.id("teams"),
    templateId: v.id("templates"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { teamId, templateId, quantity, note }) => {
    const member = await viewerWithPermissionX(ctx, teamId, "Contribute");
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a whole number of at least 1");
    }
    const hasAccess = await member.edge("templates").has(templateId);
    if (!hasAccess) {
      throw new Error("You don't have access to order this template");
    }
    await ctx.table("orders").insert({
      teamId,
      memberId: member._id,
      templateId,
      quantity,
      note,
    });
  },
});

export const myOrders = query({
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
    const orders = (await member.edge("orders")).slice().reverse();
    return await Promise.all(
      orders.map(async (order) => {
        const template = await order.edge("template");
        return {
          _id: order._id,
          _creationTime: order._creationTime,
          quantity: order.quantity,
          note: order.note,
          templateName: template.name,
        };
      })
    );
  },
});

export const list = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (
      ctx.viewer === null ||
      !(await viewerHasPermission(ctx, teamId, "Manage Team"))
    ) {
      return [];
    }
    const orders = (
      await ctx.table("teams").getX(teamId).edge("orders")
    )
      .slice()
      .reverse();
    return await Promise.all(
      orders.map(async (order) => {
        const template = await order.edge("template");
        const orderMember = await order.edge("member");
        const user = await orderMember.edge("user");
        return {
          _id: order._id,
          _creationTime: order._creationTime,
          quantity: order.quantity,
          note: order.note,
          templateName: template.name,
          memberName: user.fullName,
        };
      })
    );
  },
});

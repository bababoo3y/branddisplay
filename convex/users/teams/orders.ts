import { v } from "convex/values";
import { createDraftOrder, findOrCreateCustomer } from "../../shopify";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { internalMutation, query } from "../../functions";
import { viewerHasPermission, viewerWithPermissionX } from "../../permissions";

export const submit = action({
  args: {
    teamId: v.id("teams"),
    templateId: v.id("templates"),
    quantity: v.number(),
    note: v.optional(v.string()),
    contactPhone: v.string(),
  },
  handler: async (ctx, { teamId, templateId, quantity, note, contactPhone }) => {
    const {
      orderId,
      teamName,
      memberName,
      templateName,
      shopifyVariantId,
      email,
      firstName,
      lastName,
    } = await ctx.runMutation(internal.users.teams.orders.insert, {
      teamId,
      templateId,
      quantity,
      note,
      contactPhone,
    });

    if (shopifyVariantId === null) {
      await ctx.runMutation(internal.users.teams.orders.setShopifyResult, {
        orderId,
        shopifyError: "This template isn't linked to a Shopify product yet.",
      });
      return;
    }

    try {
      const customerId = await findOrCreateCustomer({
        email,
        firstName,
        lastName,
      });
      const draftOrder = await createDraftOrder({
        variantId: shopifyVariantId,
        quantity,
        customerId,
        note: `Order for ${teamName} from ${memberName} (${templateName})${
          note ? ` — ${note}` : ""
        }. Contact phone: ${contactPhone}`,
      });
      await ctx.runMutation(internal.users.teams.orders.setShopifyResult, {
        orderId,
        shopifyDraftOrderId: draftOrder.id,
        shopifyDraftOrderUrl: draftOrder.invoiceUrl,
      });
    } catch (error) {
      await ctx.runMutation(internal.users.teams.orders.setShopifyResult, {
        orderId,
        shopifyError:
          error instanceof Error ? error.message : "Unknown Shopify error",
      });
    }
  },
});

export const insert = internalMutation({
  args: {
    teamId: v.id("teams"),
    templateId: v.id("templates"),
    quantity: v.number(),
    note: v.optional(v.string()),
    contactPhone: v.string(),
  },
  handler: async (ctx, { teamId, templateId, quantity, note, contactPhone }) => {
    const member = await viewerWithPermissionX(ctx, teamId, "Contribute");
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a whole number of at least 1");
    }
    const hasAccess = await member.edge("templates").has(templateId);
    if (!hasAccess) {
      throw new Error("You don't have access to order this template");
    }
    const template = await ctx.table("templates").getX(templateId);
    const team = await ctx.table("teams").getX(teamId);
    const orderId = await ctx.table("orders").insert({
      teamId,
      memberId: member._id,
      templateId,
      quantity,
      note,
      contactPhone,
    });
    const user = await member.edge("user");
    return {
      orderId,
      teamName: team.name,
      memberName: user.fullName,
      templateName: template.name,
      shopifyVariantId: template.shopifyVariantId ?? null,
      email: user.email,
      firstName: user.firstName ?? user.fullName,
      lastName: user.lastName ?? "",
    };
  },
});

export const setShopifyResult = internalMutation({
  args: {
    orderId: v.id("orders"),
    shopifyDraftOrderId: v.optional(v.string()),
    shopifyDraftOrderUrl: v.optional(v.string()),
    shopifyError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, ...rest } = args;
    await ctx.table("orders").getX(orderId).patch(rest);
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
        const unitPrice =
          template.shopifyPrice === undefined
            ? null
            : Number(template.shopifyPrice);
        return {
          _id: order._id,
          _creationTime: order._creationTime,
          quantity: order.quantity,
          note: order.note,
          templateName: template.name,
          unitPrice,
          totalPrice: unitPrice === null ? null : unitPrice * order.quantity,
          shopifyDraftOrderUrl: order.shopifyDraftOrderUrl ?? null,
          shopifyError: order.shopifyError ?? null,
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
        const unitPrice =
          template.shopifyPrice === undefined
            ? null
            : Number(template.shopifyPrice);
        return {
          _id: order._id,
          _creationTime: order._creationTime,
          quantity: order.quantity,
          note: order.note,
          contactPhone: order.contactPhone,
          templateName: template.name,
          memberName: user.fullName,
          unitPrice,
          totalPrice: unitPrice === null ? null : unitPrice * order.quantity,
          shopifyDraftOrderUrl: order.shopifyDraftOrderUrl ?? null,
          shopifyError: order.shopifyError ?? null,
        };
      })
    );
  },
});

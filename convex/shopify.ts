import { action } from "./_generated/server";

const SHOPIFY_API_VERSION = "2025-01";

async function getAccessToken(shop: string): Promise<string> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (clientId === undefined || clientSecret === undefined) {
    throw new Error(
      "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET on the Convex dashboard"
    );
  }
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Could not authenticate with Shopify: ${await response.text()}`
    );
  }
  const data = await response.json();
  return data.access_token;
}

export async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  if (shop === undefined) {
    throw new Error("Set SHOPIFY_STORE_DOMAIN on the Convex dashboard");
  }
  const accessToken = await getAccessToken(shop);
  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

export const testConnection = action({
  args: {},
  handler: async () => {
    const data = await shopifyGraphQL<{ shop: { name: string } }>(
      `query { shop { name } }`
    );
    return data.shop.name;
  },
});

export async function findOrCreateCustomer({
  email,
  firstName,
  lastName,
}: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  const created = await shopifyGraphQL<{
    customerCreate: {
      customer: { id: string } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { input: { email, firstName, lastName } }
  );
  const { customer, userErrors } = created.customerCreate;
  if (customer !== null) {
    return customer.id;
  }

  // A customer with this email already exists — look up their id by email.
  // (We only ever request the id, never name/email/etc. back from Shopify.)
  const alreadyTaken = userErrors.some((error) =>
    /already been taken/i.test(error.message)
  );
  if (!alreadyTaken) {
    throw new Error(
      userErrors.length > 0
        ? userErrors.map((error) => error.message).join("; ")
        : "Shopify did not return a customer"
    );
  }
  const existing = await shopifyGraphQL<{
    customers: { nodes: { id: string }[] };
  }>(
    `query FindCustomer($query: String!) {
      customers(first: 1, query: $query) {
        nodes {
          id
        }
      }
    }`,
    { query: `email:${email}` }
  );
  if (existing.customers.nodes.length === 0) {
    throw new Error("Could not find the existing Shopify customer");
  }
  return existing.customers.nodes[0].id;
}

export async function createDraftOrder({
  variantId,
  quantity,
  note,
  customerId,
}: {
  variantId: string;
  quantity: number;
  note: string;
  customerId: string;
}): Promise<{ id: string; invoiceUrl: string }> {
  const data = await shopifyGraphQL<{
    draftOrderCreate: {
      draftOrder: { id: string; invoiceUrl: string } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        lineItems: [{ variantId, quantity }],
        note,
        customerId,
      },
    }
  );
  const { draftOrder, userErrors } = data.draftOrderCreate;
  if (draftOrder === null || userErrors.length > 0) {
    throw new Error(
      userErrors.length > 0
        ? userErrors.map((error) => error.message).join("; ")
        : "Shopify did not return a draft order"
    );
  }
  return draftOrder;
}

export const listProducts = action({
  args: {},
  handler: async () => {
    const data = await shopifyGraphQL<{
      products: {
        nodes: {
          id: string;
          title: string;
          variants: { nodes: { id: string; title: string; price: string }[] };
        }[];
      };
    }>(`
      query {
        products(first: 25) {
          nodes {
            id
            title
            variants(first: 5) {
              nodes {
                id
                title
                price
              }
            }
          }
        }
      }
    `);
    return data.products.nodes;
  },
});

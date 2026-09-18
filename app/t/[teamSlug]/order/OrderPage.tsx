"use client";

import { handleFailure } from "@/app/handleFailure";
import { useCurrentTeam } from "@/app/t/[teamSlug]/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";

export function OrderPage() {
  const team = useCurrentTeam();
  const templates = useQuery(
    api.users.teams.templates.myTemplates,
    team == null ? "skip" : { teamId: team._id }
  );
  const orders = useQuery(
    api.users.teams.orders.myOrders,
    team == null ? "skip" : { teamId: team._id }
  );

  if (team == null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 mt-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {templates?.map((template) => (
          <OrderTemplateCard
            key={template._id}
            teamId={team._id}
            templateId={template._id}
            name={template.name}
            thumbnailUrl={template.thumbnailUrl}
          />
        ))}
        {templates?.length === 0 && (
          <div className="text-muted-foreground col-span-full">
            You don&apos;t have access to any templates yet. Ask your
            organisation admin to grant you access.
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-bold mb-4">My orders</h2>
        <div className="flex flex-col gap-2 max-w-xl">
          {orders?.map((order) => (
            <div
              key={order._id}
              className="flex justify-between text-sm border rounded-md p-3"
            >
              <div>
                <div className="font-medium">{order.templateName}</div>
                {order.note && (
                  <div className="text-muted-foreground">{order.note}</div>
                )}
                {order.shopifyDraftOrderUrl && (
                  <a
                    href={order.shopifyDraftOrderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-xs"
                  >
                    View Shopify draft order
                  </a>
                )}
                {order.shopifyError && (
                  <div className="text-destructive text-xs">
                    Not yet synced to Shopify: {order.shopifyError}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">
                  Qty {order.quantity}
                </div>
                <div className="font-semibold">
                  {order.totalPrice === null
                    ? "Price pending"
                    : `$${order.totalPrice.toFixed(2)}`}
                </div>
              </div>
            </div>
          ))}
          {orders?.length === 0 && (
            <div className="text-muted-foreground">
              You haven&apos;t submitted any orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderTemplateCard({
  teamId,
  templateId,
  name,
  thumbnailUrl,
}: {
  teamId: Id<"teams">;
  templateId: Id<"templates">;
  name: string;
  thumbnailUrl: string | null;
}) {
  const submitOrder = useAction(api.users.teams.orders.submit);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        {/*eslint-disable-next-line @next/next/no-img-element*/}
        <img
          src={thumbnailUrl ?? undefined}
          alt={name}
          className="w-full aspect-square object-cover rounded-md border mb-3"
        />
        <div className="font-medium truncate mb-2">{name}</div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`qty-${templateId}`}>Quantity</Label>
          <Input
            id={`qty-${templateId}`}
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          <Label htmlFor={`phone-${templateId}`}>Contact phone</Label>
          <Input
            id={`phone-${templateId}`}
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="e.g. 021 234 5678"
          />
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          <Label htmlFor={`note-${templateId}`}>Note (optional)</Label>
          <Input
            id={`note-${templateId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. branch name"
          />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          disabled={submitting || Number(quantity) < 1 || contactPhone.trim() === ""}
          onClick={handleFailure(async () => {
            setSubmitting(true);
            try {
              await submitOrder({
                teamId,
                templateId,
                quantity: Number(quantity),
                note: note.trim() === "" ? undefined : note.trim(),
                contactPhone: contactPhone.trim(),
              });
              setQuantity("1");
              setNote("");
              toast({ title: "Order submitted." });
            } finally {
              setSubmitting(false);
            }
          })}
        >
          Request order
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useCurrentTeam } from "@/app/t/[teamSlug]/hooks";
import { SettingsMenuButton } from "@/app/t/[teamSlug]/settings/SettingsMenuButton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function OrdersSettingsPage() {
  const team = useCurrentTeam();
  const orders = useQuery(
    api.users.teams.orders.list,
    team == null ? "skip" : { teamId: team._id }
  );

  if (team == null) {
    return null;
  }

  return (
    <>
      <div className="flex items-center mt-8">
        <SettingsMenuButton />
        <h1 className="text-4xl font-extrabold">Orders</h1>
      </div>
      <Table>
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order._id}>
              <TableCell>
                <div className="font-medium">{order.templateName}</div>
                {order.note && (
                  <div className="text-muted-foreground text-sm">
                    {order.note}
                  </div>
                )}
              </TableCell>
              <TableCell>{order.memberName}</TableCell>
              <TableCell>Qty {order.quantity}</TableCell>
              <TableCell>
                {new Date(order._creationTime).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders?.length === 0 && (
        <div className="text-muted-foreground text-sm">
          No orders have been submitted yet.
        </div>
      )}
    </>
  );
}

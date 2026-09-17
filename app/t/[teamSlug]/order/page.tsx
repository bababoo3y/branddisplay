"use client";

import { useCurrentTeam } from "@/app/t/[teamSlug]/hooks";
import { OrderPage } from "@/app/t/[teamSlug]/order/OrderPage";

export default function Order() {
  const team = useCurrentTeam();
  if (team == null) {
    return null;
  }
  return (
    <main className="container">
      <h1 className="text-4xl font-extrabold my-8">Order</h1>
      <p>Order approved signage from the templates you have access to.</p>
      <OrderPage />
    </main>
  );
}

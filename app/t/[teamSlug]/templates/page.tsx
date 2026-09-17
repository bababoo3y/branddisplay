"use client";

import { useCurrentTeam } from "@/app/t/[teamSlug]/hooks";
import { TemplateLibrary } from "@/app/t/[teamSlug]/templates/TemplateLibrary";

export default function TemplatesPage() {
  const team = useCurrentTeam();
  if (team == null) {
    return null;
  }
  return (
    <main className="container">
      <h1 className="text-4xl font-extrabold my-8">Templates</h1>
      <p>Approved artwork templates that members of this organisation can order from.</p>
      <TemplateLibrary />
    </main>
  );
}

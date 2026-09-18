"use client";

import { handleFailure } from "@/app/handleFailure";
import { useCurrentTeam, useViewerPermissions } from "@/app/t/[teamSlug]/hooks";
import { SettingsMenuButton } from "@/app/t/[teamSlug]/settings/SettingsMenuButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

const emptyBilling = {
  billingCompany: "",
  billingAddress1: "",
  billingAddress2: "",
  billingCity: "",
  billingRegion: "",
  billingZip: "",
  billingCountry: "",
  billingPhone: "",
};

export default function BillingSettingsPage() {
  const team = useCurrentTeam();
  const permissions = useViewerPermissions();
  const billing = useQuery(
    api.users.teams.billing.get,
    team == null ? "skip" : { teamId: team._id }
  );
  const setBilling = useMutation(api.users.teams.billing.set);
  const [form, setForm] = useState(emptyBilling);
  const [submitting, setSubmitting] = useState(false);
  const hasManagePermission = permissions?.has("Manage Team") ?? false;

  useEffect(() => {
    if (billing) {
      setForm(billing);
    }
  }, [billing]);

  if (team == null) {
    return null;
  }

  return (
    <>
      <div className="flex items-center mt-8">
        <SettingsMenuButton />
        <h1 className="text-4xl font-extrabold">Billing address</h1>
      </div>
      <Card disabled={!hasManagePermission}>
        <CardHeader>
          <CardTitle>Organisation billing address</CardTitle>
          <CardDescription>
            Used as the billing address on Shopify draft orders created from
            this organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 max-w-md">
          <Field
            label="Company name"
            value={form.billingCompany}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingCompany: v })}
          />
          <Field
            label="Address line 1"
            value={form.billingAddress1}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingAddress1: v })}
          />
          <Field
            label="Address line 2 (optional)"
            value={form.billingAddress2}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingAddress2: v })}
          />
          <Field
            label="City"
            value={form.billingCity}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingCity: v })}
          />
          <Field
            label="Region / State"
            value={form.billingRegion}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingRegion: v })}
          />
          <Field
            label="Postcode"
            value={form.billingZip}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingZip: v })}
          />
          <Field
            label="Country"
            value={form.billingCountry}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingCountry: v })}
          />
          <Field
            label="Phone (optional)"
            value={form.billingPhone}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, billingPhone: v })}
          />
        </CardContent>
        <CardFooter>
          <Button
            disabled={!hasManagePermission || submitting}
            onClick={handleFailure(async () => {
              setSubmitting(true);
              try {
                await setBilling({ teamId: team._id, ...form });
                toast({ title: "Billing address saved." });
              } finally {
                setSubmitting(false);
              }
            })}
          >
            Save
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

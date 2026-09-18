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
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";

const emptyForm = {
  name: "",
  address1: "",
  address2: "",
  city: "",
  region: "",
  zip: "",
  country: "",
  phone: "",
};

export default function CostCentresSettingsPage() {
  const team = useCurrentTeam();
  const permissions = useViewerPermissions();
  const costCentres = useQuery(
    api.users.teams.costCentres.list,
    team == null ? "skip" : { teamId: team._id }
  );
  const createCostCentre = useMutation(api.users.teams.costCentres.create);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const hasManagePermission = permissions?.has("Manage Team") ?? false;

  if (team == null) {
    return null;
  }

  return (
    <>
      <div className="flex items-center mt-8">
        <SettingsMenuButton />
        <h1 className="text-4xl font-extrabold">Cost centres</h1>
      </div>

      <Card disabled={!hasManagePermission}>
        <CardHeader>
          <CardTitle>Add a cost centre</CardTitle>
          <CardDescription>
            A branch or shipping location members can choose from when
            placing an order.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 max-w-md">
          <Field
            label="Name"
            value={form.name}
            disabled={!hasManagePermission}
            placeholder="e.g. Auckland Branch"
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Address line 1"
            value={form.address1}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, address1: v })}
          />
          <Field
            label="Address line 2 (optional)"
            value={form.address2}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, address2: v })}
          />
          <Field
            label="City"
            value={form.city}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <Field
            label="Region / State"
            value={form.region}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, region: v })}
          />
          <Field
            label="Postcode"
            value={form.zip}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, zip: v })}
          />
          <Field
            label="Country"
            value={form.country}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, country: v })}
          />
          <Field
            label="Phone (optional)"
            value={form.phone}
            disabled={!hasManagePermission}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
        </CardContent>
        <CardFooter>
          <Button
            disabled={
              !hasManagePermission ||
              submitting ||
              form.name.trim() === "" ||
              form.address1.trim() === "" ||
              form.city.trim() === "" ||
              form.zip.trim() === "" ||
              form.country.trim() === ""
            }
            onClick={handleFailure(async () => {
              setSubmitting(true);
              try {
                await createCostCentre({
                  teamId: team._id,
                  name: form.name,
                  address1: form.address1,
                  address2: form.address2 || undefined,
                  city: form.city,
                  region: form.region || undefined,
                  zip: form.zip,
                  country: form.country,
                  phone: form.phone || undefined,
                });
                setForm(emptyForm);
                toast({ title: "Cost centre added." });
              } finally {
                setSubmitting(false);
              }
            })}
          >
            Add cost centre
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-3 max-w-md">
        {costCentres?.map((costCentre) => (
          <Card key={costCentre._id}>
            <CardContent className="p-4 flex justify-between items-start">
              <div>
                <div className="font-medium">{costCentre.name}</div>
                <div className="text-sm text-muted-foreground">
                  {costCentre.address1}
                  {costCentre.address2 ? `, ${costCentre.address2}` : ""},{" "}
                  {costCentre.city} {costCentre.zip}, {costCentre.country}
                </div>
              </div>
              {hasManagePermission && (
                <DeleteButton costCentreId={costCentre._id} />
              )}
            </CardContent>
          </Card>
        ))}
        {costCentres?.length === 0 && (
          <div className="text-muted-foreground text-sm">
            No cost centres added yet.
          </div>
        )}
      </div>
    </>
  );
}

function DeleteButton({ costCentreId }: { costCentreId: Id<"costCentres"> }) {
  const removeCostCentre = useMutation(api.users.teams.costCentres.remove);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFailure(async () => {
        await removeCostCentre({ costCentreId });
        toast({ title: "Cost centre deleted." });
      })}
    >
      <TrashIcon className="h-4 w-4" />
    </Button>
  );
}

function Field({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

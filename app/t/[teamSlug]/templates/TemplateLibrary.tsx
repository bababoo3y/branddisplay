"use client";

import { handleFailure } from "@/app/handleFailure";
import { useCurrentTeam, useViewerPermissions } from "@/app/t/[teamSlug]/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import {
  Link1Icon,
  PersonIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";

export function TemplateLibrary() {
  const team = useCurrentTeam();
  const permissions = useViewerPermissions();
  const templates = useQuery(
    api.users.teams.templates.list,
    team == null ? "skip" : { teamId: team._id }
  );
  const hasManagePermission = permissions?.has("Manage Team") ?? false;

  if (team == null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 mt-8">
      <UploadTemplateForm teamId={team._id} disabled={!hasManagePermission} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {templates?.map((template) => (
          <Card key={template._id}>
            <CardContent className="p-4">
              {/*eslint-disable-next-line @next/next/no-img-element*/}
              <img
                src={template.thumbnailUrl ?? undefined}
                alt={template.name}
                className="w-full aspect-square object-cover rounded-md border mb-3"
              />
              <div className="font-medium truncate">{template.name}</div>
              {template.shopifyProductTitle ? (
                <div className="text-sm text-muted-foreground">
                  <div className="truncate">
                    {template.shopifyProductTitle} —{" "}
                    {template.shopifyVariantTitle}
                  </div>
                  <div className="font-semibold text-foreground">
                    ${template.shopifyPrice}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-600">
                  Not linked to a Shopify product yet
                </div>
              )}
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                {template.pdfUrl && (
                  <a
                    href={template.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    PDF
                  </a>
                )}
                {template.pngUrl && (
                  <a
                    href={template.pngUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    PNG
                  </a>
                )}
              </div>
            </CardContent>
            {hasManagePermission && (
              <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
                <ManageAccessPopover
                  teamId={team._id}
                  templateId={template._id}
                />
                <LinkShopifyProductPopover templateId={template._id} />
                <DeleteTemplateButton templateId={template._id} />
              </CardFooter>
            )}
          </Card>
        ))}
        {templates?.length === 0 && (
          <div className="text-muted-foreground col-span-full">
            No templates uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function UploadTemplateForm({
  teamId,
  disabled,
}: {
  teamId: Id<"teams">;
  disabled: boolean;
}) {
  const generateUploadUrl = useMutation(
    api.users.teams.templates.generateUploadUrl
  );
  const createTemplate = useMutation(api.users.teams.templates.create);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const postUrl = await generateUploadUrl({ teamId });
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    return storageId;
  }

  return (
    <Card disabled={disabled}>
      <CardHeader>
        <CardTitle>Upload a template</CardTitle>
        <CardDescription>
          Add an approved artwork template to this organisation&apos;s
          library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="flex flex-col gap-4 max-w-md hide-lastpass-icon"
          onSubmit={handleFailure(async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            const thumbnailFile = (
              form.elements.namedItem("thumbnail") as HTMLInputElement
            ).files?.[0];
            const pdfFile = (form.elements.namedItem("pdf") as HTMLInputElement)
              .files?.[0];
            const pngFile = (form.elements.namedItem("png") as HTMLInputElement)
              .files?.[0];
            if (!thumbnailFile) {
              toast({
                title: "A thumbnail image is required",
                variant: "destructive",
              });
              return;
            }
            setSubmitting(true);
            try {
              const thumbnailStorageId = await uploadFile(thumbnailFile);
              const pdfStorageId = pdfFile
                ? await uploadFile(pdfFile)
                : undefined;
              const pngStorageId = pngFile
                ? await uploadFile(pngFile)
                : undefined;
              await createTemplate({
                teamId,
                name,
                thumbnailStorageId,
                pdfStorageId,
                pngStorageId,
              });
              setName("");
              formRef.current?.reset();
              toast({ title: "Template uploaded." });
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Template name</Label>
            <Input
              id="name"
              name="name"
              disabled={disabled}
              placeholder="e.g. Outdoor A-Frame Sign"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thumbnail">Thumbnail image (required)</Label>
            <Input
              id="thumbnail"
              name="thumbnail"
              type="file"
              accept="image/*"
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pdf">Layered artwork PDF (optional)</Label>
            <Input
              id="pdf"
              name="pdf"
              type="file"
              accept="application/pdf"
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="png">PNG snippet (optional)</Label>
            <Input
              id="png"
              name="png"
              type="file"
              accept="image/png"
              disabled={disabled}
            />
          </div>
          <Button
            disabled={disabled || submitting || name.trim() === ""}
            type="submit"
            className="w-fit"
          >
            <UploadIcon className="mr-2 h-4 w-4" /> Upload template
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ManageAccessPopover({
  teamId,
  templateId,
}: {
  teamId: Id<"teams">;
  templateId: Id<"templates">;
}) {
  const { results: members } = usePaginatedQuery(
    api.users.teams.members.list,
    { teamId, search: "" },
    { initialNumItems: 40 }
  );
  const access = useQuery(api.users.teams.templates.accessForTemplate, {
    templateId,
  });
  const setAccess = useMutation(api.users.teams.templates.setAccess);
  const accessSet = new Set(access ?? []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <PersonIcon className="mr-2 h-4 w-4" /> Who can order
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="text-sm font-medium mb-2">
          Members who can order this template
        </div>
        <div className="flex flex-col gap-2 max-h-64 overflow-auto">
          {members.map((member) => (
            <label
              key={member._id}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={accessSet.has(member._id)}
                onCheckedChange={(checked) =>
                  handleFailure(async () => {
                    await setAccess({
                      templateId,
                      memberId: member._id,
                      hasAccess: checked === true,
                    });
                  })()
                }
              />
              {member.fullName}
            </label>
          ))}
          {members.length === 0 && (
            <div className="text-muted-foreground text-sm">
              No members yet.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ShopifyProduct = {
  id: string;
  title: string;
  variants: { nodes: { id: string; title: string; price: string }[] };
};

function LinkShopifyProductPopover({
  templateId,
}: {
  templateId: Id<"templates">;
}) {
  const [open, setOpen] = useState(false);
  const listProducts = useAction(api.shopify.listProducts);
  const setShopifyVariant = useMutation(
    api.users.teams.templates.setShopifyVariant
  );
  const [products, setProducts] = useState<ShopifyProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");

  useEffect(() => {
    if (!open || products !== null) {
      return;
    }
    setLoading(true);
    listProducts({})
      .then((result) => setProducts(result as ShopifyProduct[]))
      .catch(() =>
        toast({
          title: "Could not load Shopify products",
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
  }, [open, products, listProducts]);

  const selectedProduct = products?.find((product) => product.id === productId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link1Icon className="mr-2 h-4 w-4" /> Link product
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="text-sm font-medium mb-2">Link a Shopify product</div>
        {loading && (
          <div className="text-muted-foreground text-sm">
            Loading products from Shopify...
          </div>
        )}
        {products && (
          <div className="flex flex-col gap-3">
            <Select
              value={productId}
              onValueChange={(value) => {
                setProductId(value);
                setVariantId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a variant" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.nodes.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.title} — ${variant.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              disabled={!selectedProduct || variantId === ""}
              onClick={handleFailure(async () => {
                const variant = selectedProduct?.variants.nodes.find(
                  (v) => v.id === variantId
                );
                if (!selectedProduct || !variant) {
                  return;
                }
                await setShopifyVariant({
                  templateId,
                  shopifyVariantId: variant.id,
                  shopifyProductTitle: selectedProduct.title,
                  shopifyVariantTitle: variant.title,
                  shopifyPrice: variant.price,
                });
                toast({ title: "Template linked to Shopify product." });
                setOpen(false);
              })}
            >
              Save link
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DeleteTemplateButton({ templateId }: { templateId: Id<"templates"> }) {
  const removeTemplate = useMutation(api.users.teams.templates.remove);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFailure(async () => {
        await removeTemplate({ templateId });
        toast({ title: "Template deleted." });
      })}
    >
      <TrashIcon className="mr-2 h-4 w-4" /> Delete
    </Button>
  );
}

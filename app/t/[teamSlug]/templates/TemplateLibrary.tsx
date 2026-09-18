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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  CaretSortIcon,
  CheckIcon,
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
              <div className="text-sm text-muted-foreground">
                <div className="truncate">
                  {template.shopifyProductTitle} —{" "}
                  {template.shopifyVariantTitle}
                </div>
                <div className="font-semibold text-foreground">
                  ${template.shopifyPrice}
                </div>
              </div>
              {template.pdfUrl && (
                <a
                  href={template.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-xs text-muted-foreground"
                >
                  PDF
                </a>
              )}
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

type ShopifyProduct = {
  id: string;
  title: string;
  variants: { nodes: { id: string; title: string; price: string }[] };
};

type ShopifyVariantSelection = {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  price: string;
};

function ProductVariantPicker({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (selection: ShopifyVariantSelection | null) => void;
}) {
  const listProducts = useAction(api.shopify.listProducts);
  const [products, setProducts] = useState<ShopifyProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");

  useEffect(() => {
    listProducts({})
      .then((result) => setProducts(result as ShopifyProduct[]))
      .catch(() =>
        toast({
          title: "Could not load Shopify products",
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = products?.find((product) => product.id === productId);
  const selectedVariant = selectedProduct?.variants.nodes.find(
    (variant) => variant.id === variantId
  );

  useEffect(() => {
    if (selectedProduct && selectedVariant) {
      onChange({
        variantId: selectedVariant.id,
        productTitle: selectedProduct.title,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price,
      });
    } else {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm">
        Loading products from Shopify...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ProductCombobox
        products={products ?? []}
        disabled={disabled}
        value={productId}
        onChange={(value) => {
          setProductId(value);
          setVariantId("");
        }}
      />
      {selectedProduct && (
        <Select disabled={disabled} value={variantId} onValueChange={setVariantId}>
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
    </div>
  );
}

function ProductCombobox({
  products,
  value,
  disabled,
  onChange,
}: {
  products: ShopifyProduct[];
  value: string;
  disabled?: boolean;
  onChange: (productId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="justify-between font-normal"
        >
          <span className="truncate">{selected ? selected.title : "Choose a product"}</span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.title}
                  onSelect={() => {
                    onChange(product.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={
                      "mr-2 h-4 w-4 " +
                      (product.id === value ? "opacity-100" : "opacity-0")
                    }
                  />
                  {product.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [selection, setSelection] = useState<ShopifyVariantSelection | null>(
    null
  );
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
            if (!thumbnailFile) {
              toast({
                title: "A thumbnail image is required",
                variant: "destructive",
              });
              return;
            }
            if (!selection) {
              toast({
                title: "Choose a Shopify product and variant",
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
              await createTemplate({
                teamId,
                name,
                thumbnailStorageId,
                pdfStorageId,
                shopifyVariantId: selection.variantId,
                shopifyProductTitle: selection.productTitle,
                shopifyVariantTitle: selection.variantTitle,
                shopifyPrice: selection.price,
              });
              setName("");
              setSelection(null);
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
            <Label>Shopify product (required)</Label>
            <ProductVariantPicker disabled={disabled} onChange={setSelection} />
          </div>
          <Button
            disabled={disabled || submitting || name.trim() === "" || !selection}
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

function LinkShopifyProductPopover({
  templateId,
}: {
  templateId: Id<"templates">;
}) {
  const [open, setOpen] = useState(false);
  const setShopifyVariant = useMutation(
    api.users.teams.templates.setShopifyVariant
  );
  const [selection, setSelection] = useState<ShopifyVariantSelection | null>(
    null
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link1Icon className="mr-2 h-4 w-4" /> Change product
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="text-sm font-medium mb-2">Link a Shopify product</div>
        <div className="flex flex-col gap-3">
          <ProductVariantPicker onChange={setSelection} />
          <Button
            disabled={!selection}
            onClick={handleFailure(async () => {
              if (!selection) {
                return;
              }
              await setShopifyVariant({
                templateId,
                shopifyVariantId: selection.variantId,
                shopifyProductTitle: selection.productTitle,
                shopifyVariantTitle: selection.variantTitle,
                shopifyPrice: selection.price,
              });
              toast({ title: "Template linked to Shopify product." });
              setOpen(false);
            })}
          >
            Save link
          </Button>
        </div>
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

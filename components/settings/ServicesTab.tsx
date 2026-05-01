"use client";

import { useState, useTransition } from "react";
import { Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Service = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  unit_price: number | null;
  unit_cost: number | null;
  is_active: boolean | null;
};

export function ServicesTab({
  services,
  createAction,
  toggleAction,
}: {
  services: Service[];
  createAction: (formData: FormData) => Promise<{ error?: string } | void>;
  toggleAction: (serviceId: string, active: boolean) => Promise<{ error?: string } | void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onCreate(formData: FormData) {
    setError(null);
    const result = await createAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-5">
      <form action={onCreate} className="grid gap-3 rounded-lg border border-[#dfe8f0] bg-white p-4 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="service-name">Service name</Label>
          <Input id="service-name" name="name" className="min-h-11" placeholder="Spring cleanup" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-category">Category</Label>
          <Input id="service-category" name="category" className="min-h-11" placeholder="Landscape" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-price">Price</Label>
          <Input id="service-price" name="unit_price" className="min-h-11" type="number" min="0" step="0.01" placeholder="150" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-cost">Cost</Label>
          <Input id="service-cost" name="unit_cost" className="min-h-11" type="number" min="0" step="0.01" placeholder="65" />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="min-h-11 w-full" disabled={pending}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {error ? <p className="lg:col-span-5 text-sm font-medium text-destructive">{error}</p> : null}
      </form>

      <div className="grid gap-3 lg:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#1a2d3d]">{service.name}</h3>
                  <Badge variant={service.is_active === false ? "outline" : "secondary"}>
                    {service.is_active === false ? "Inactive" : "Active"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {service.category ?? "Uncategorized"} · {service.unit ?? "flat"} ·{" "}
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    service.unit_price ?? 0
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleAction(service.id, !(service.is_active === false));
                  })
                }
              >
                <Power className="size-4" />
                {service.is_active === false ? "Activate" : "Disable"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Leaf } from "lucide-react";
import { getBusinessBySlug } from "@/lib/supabase/queries/requests";
import { BookingForm } from "@/components/requests/BookingForm";

interface BookingPageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { businessSlug } = await params;
  const business = await getBusinessBySlug(businessSlug);

  if (!business) notFound();

  return (
    <main className="min-h-screen bg-[#f6f9fc] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-sm text-muted-foreground">Request landscaping service</p>
          </div>
        </div>

        <BookingForm businessId={business.id} />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          This booking form can be embedded on your website with an iframe.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { createClient as createClientRecord } from "@/lib/supabase/queries/clients";
import { parseClientCsv, clientCsvColumns } from "@/lib/clients/csv";

interface ClientImportPageProps {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
}

export default async function ClientImportPage({ searchParams }: ClientImportPageProps) {
  const params = await searchParams;
  const createdCount = Number(params.created ?? "0");
  const errorMessage = params.error ? decodeURIComponent(params.error) : "";

  async function importAction(formData: FormData) {
    "use server";

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirect("/clients/import?error=Please+choose+a+CSV+file.");
    }

    let createdCount = 0;

    try {
      const rows = parseClientCsv(await file.text());
      createdCount = rows.length;

      for (const row of rows) {
        await createClientRecord(row);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import clients.";
      redirect(`/clients/import?error=${encodeURIComponent(message)}`);
    }

    revalidatePath("/clients");
    redirect(`/clients/import?created=${createdCount}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Import Clients</CardTitle>
          <CardDescription>
            Upload a CSV with the standard client columns used by this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {!errorMessage && createdCount > 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Imported {createdCount} client{createdCount === 1 ? "" : "s"}.
            </div>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium text-gray-900">Required CSV headers</p>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {clientCsvColumns.join(", ")}
            </p>
            <div className="mt-4">
              <Link
                href="/api/clients/export?template=1"
                className={buttonVariants({ variant: "outline" })}
              >
                <Download className="size-4" />
                Download sample structure
              </Link>
            </div>
          </div>

          <form action={importAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="file" className="text-sm font-medium text-gray-900">
                CSV file
              </label>
              <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
            </div>

            <button type="submit" className={buttonVariants()}>
              <Upload className="size-4" />
              Import clients
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

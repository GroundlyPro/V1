import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type SearchResultType = "client" | "job" | "quote" | "invoice" | "request";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

function cleanSearch(value: string) {
  return value.replaceAll("%", "").trim();
}

function clientLabel(client: {
  first_name: string;
  last_name: string;
  company_name: string | null;
}) {
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function uniqueResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.type}-${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function globalSearch(businessId: string, rawQuery: string): Promise<SearchResult[]> {
  const supabase = await createSupabaseClient();
  const query = cleanSearch(rawQuery);

  if (!query) return [];

  const like = `%${query}%`;
  const [clientsResult, addressesResult, jobsResult, quotesResult, invoicesResult, requestsResult] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name, company_name, email, phone, status")
        .eq("business_id", businessId)
        .or(
          `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`
        )
        .limit(8),
      supabase
        .from("client_addresses")
        .select("id, client_id")
        .eq("business_id", businessId)
        .or(
          `label.ilike.${like},street1.ilike.${like},street2.ilike.${like},city.ilike.${like},state.ilike.${like},zip.ilike.${like}`
        )
        .limit(20),
      supabase
        .from("jobs")
        .select("id, job_number, title, status, clients(first_name, last_name, company_name)")
        .eq("business_id", businessId)
        .or(`title.ilike.${like},job_number.ilike.${like}`)
        .limit(8),
      supabase
        .from("quotes")
        .select("id, quote_number, title, status, clients(first_name, last_name, company_name)")
        .eq("business_id", businessId)
        .or(`title.ilike.${like},quote_number.ilike.${like}`)
        .limit(8),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total, clients(first_name, last_name, company_name)")
        .eq("business_id", businessId)
        .or(`invoice_number.ilike.${like}`)
        .limit(8),
      supabase
        .from("requests")
        .select("id, first_name, last_name, email, phone, address, service_type, status")
        .eq("business_id", businessId)
        .or(
          `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},address.ilike.${like},service_type.ilike.${like}`
        )
        .limit(8),
    ]);

  if (clientsResult.error) throw clientsResult.error;
  if (addressesResult.error) throw addressesResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (quotesResult.error) throw quotesResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (requestsResult.error) throw requestsResult.error;

  const addressRows = addressesResult.data ?? [];
  const addressClientIds = [...new Set(addressRows.map((address) => address.client_id))];
  const addressIds = [...new Set(addressRows.map((address) => address.id))];
  const directClientIds = (clientsResult.data ?? []).map((client) => client.id);
  const linkedClientIds = [...new Set([...directClientIds, ...addressClientIds])];

  const [
    addressClientsResult,
    linkedJobsByClientResult,
    linkedJobsByAddressResult,
    linkedQuotesByClientResult,
    linkedQuotesByAddressResult,
    linkedInvoicesResult,
    linkedRequestsResult,
  ] = await Promise.all([
    addressClientIds.length > 0
      ? supabase
          .from("clients")
          .select("id, first_name, last_name, company_name, email, phone, status")
          .eq("business_id", businessId)
          .in("id", addressClientIds)
      : Promise.resolve({ data: [], error: null }),
    linkedClientIds.length > 0
      ? supabase
          .from("jobs")
          .select("id, job_number, title, status, clients(first_name, last_name, company_name)")
          .eq("business_id", businessId)
          .in("client_id", linkedClientIds)
      : Promise.resolve({ data: [], error: null }),
    addressIds.length > 0
      ? supabase
          .from("jobs")
          .select("id, job_number, title, status, clients(first_name, last_name, company_name)")
          .eq("business_id", businessId)
          .in("address_id", addressIds)
      : Promise.resolve({ data: [], error: null }),
    linkedClientIds.length > 0
      ? supabase
          .from("quotes")
          .select("id, quote_number, title, status, clients(first_name, last_name, company_name)")
          .eq("business_id", businessId)
          .in("client_id", linkedClientIds)
      : Promise.resolve({ data: [], error: null }),
    addressIds.length > 0
      ? supabase
          .from("quotes")
          .select("id, quote_number, title, status, clients(first_name, last_name, company_name)")
          .eq("business_id", businessId)
          .in("address_id", addressIds)
      : Promise.resolve({ data: [], error: null }),
    linkedClientIds.length > 0
      ? supabase
          .from("invoices")
          .select("id, invoice_number, status, total, clients(first_name, last_name, company_name)")
          .eq("business_id", businessId)
          .in("client_id", linkedClientIds)
      : Promise.resolve({ data: [], error: null }),
    linkedClientIds.length > 0
      ? supabase
          .from("requests")
          .select("id, first_name, last_name, email, phone, service_type, status")
          .eq("business_id", businessId)
          .in("client_id", linkedClientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (addressClientsResult.error) throw addressClientsResult.error;
  if (linkedJobsByClientResult.error) throw linkedJobsByClientResult.error;
  if (linkedJobsByAddressResult.error) throw linkedJobsByAddressResult.error;
  if (linkedQuotesByClientResult.error) throw linkedQuotesByClientResult.error;
  if (linkedQuotesByAddressResult.error) throw linkedQuotesByAddressResult.error;
  if (linkedInvoicesResult.error) throw linkedInvoicesResult.error;
  if (linkedRequestsResult.error) throw linkedRequestsResult.error;

  const clients: SearchResult[] = [
    ...(clientsResult.data ?? []),
    ...(addressClientsResult.data ?? []),
  ].map((client) => ({
    id: client.id,
    type: "client",
    title: clientLabel(client),
    subtitle: [client.email, client.phone].filter(Boolean).join(" - ") || "Client",
    href: `/clients/${client.id}`,
    status: client.status,
  }));

  const jobs: SearchResult[] = [
    ...(jobsResult.data ?? []),
    ...(linkedJobsByClientResult.data ?? []),
    ...(linkedJobsByAddressResult.data ?? []),
  ].map((job) => {
    const client = Array.isArray(job.clients) ? job.clients[0] : job.clients;
    return {
      id: job.id,
      type: "job",
      title: job.title,
      subtitle: [job.job_number, client ? clientLabel(client) : null].filter(Boolean).join(" - "),
      href: `/jobs/${job.id}`,
      status: job.status,
    };
  });

  const quotes: SearchResult[] = [
    ...(quotesResult.data ?? []),
    ...(linkedQuotesByClientResult.data ?? []),
    ...(linkedQuotesByAddressResult.data ?? []),
  ].map((quote) => {
    const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients;
    return {
      id: quote.id,
      type: "quote",
      title: quote.title,
      subtitle: [quote.quote_number, client ? clientLabel(client) : null].filter(Boolean).join(" - "),
      href: `/quotes/${quote.id}`,
      status: quote.status,
    };
  });

  const invoices: SearchResult[] = [
    ...(invoicesResult.data ?? []),
    ...(linkedInvoicesResult.data ?? []),
  ].map((invoice) => {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    return {
      id: invoice.id,
      type: "invoice",
      title: invoice.invoice_number,
      subtitle: [client ? clientLabel(client) : null, `$${Number(invoice.total ?? 0).toFixed(0)}`]
        .filter(Boolean)
        .join(" - "),
      href: `/invoices/${invoice.id}`,
      status: invoice.status,
    };
  });

  const requests: SearchResult[] = [
    ...(requestsResult.data ?? []),
    ...(linkedRequestsResult.data ?? []),
  ].map((request) => ({
    id: request.id,
    type: "request",
    title: `${request.first_name} ${request.last_name}`,
    subtitle: [request.service_type, request.email, request.phone].filter(Boolean).join(" - "),
    href: `/requests/${request.id}`,
    status: request.status,
  }));

  return uniqueResults([...clients, ...jobs, ...quotes, ...invoices, ...requests]).slice(0, 25);
}

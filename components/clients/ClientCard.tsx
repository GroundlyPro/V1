import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ClientRowActions } from "@/components/clients/ClientRowActions";
import { ClientStatusSelect } from "@/components/clients/ClientStatusSelect";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ClientListItem } from "@/lib/supabase/queries/clients";

function formatAddress(client: ClientListItem) {
  const primary =
    client.client_addresses.find((address) => address.is_primary) ??
    client.client_addresses[0];

  if (!primary) return "No address";

  return [primary.street1, primary.city, primary.state].filter(Boolean).join(", ");
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ClientCard({ client }: { client: ClientListItem }) {
  const name = `${client.first_name} ${client.last_name}`;
  const displayName = client.company_name ? `${client.company_name} (${name})` : name;

  return (
    <TableRow className="group">
      <TableCell>
        <Link
          href={`/clients/${client.id}`}
          className="font-medium text-gray-900 hover:text-brand"
        >
          {displayName}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {client.phone || "No phone"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" />
            {client.email || "No email"}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-[28%] max-w-0 whitespace-normal">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="block truncate">{formatAddress(client)}</span>
        </span>
      </TableCell>
      <TableCell className="w-[12%] whitespace-nowrap text-sm text-muted-foreground">
        {formatDate(client.created_at)}
      </TableCell>
      <TableCell className="w-[12%] whitespace-nowrap">
        <ClientStatusSelect
          clientId={client.id}
          status={(client.status as "active" | "lead" | "inactive") ?? "inactive"}
        />
      </TableCell>
      <TableCell className="w-[4%] whitespace-nowrap text-right">
        <ClientRowActions
          clientId={client.id}
          clientName={displayName}
          email={client.email}
          phone={client.phone}
        />
      </TableCell>
    </TableRow>
  );
}

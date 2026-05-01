import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ClientListItem } from "@/lib/supabase/queries/clients";

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function formatAddress(client: ClientListItem) {
  const primary =
    client.client_addresses.find((address) => address.is_primary) ??
    client.client_addresses[0];

  if (!primary) return "No address";

  return [primary.street1, primary.city, primary.state].filter(Boolean).join(", ");
}

const statusClasses: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  lead: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-600",
};

export function ClientCard({ client }: { client: ClientListItem }) {
  const name = `${client.first_name} ${client.last_name}`;

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/clients/${client.id}`}
          className="font-medium text-gray-900 hover:text-brand"
        >
          {client.company_name ? `${client.company_name} (${name})` : name}
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
      <TableCell className="max-w-xs">
        <span className="inline-flex items-center gap-1.5 truncate text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {formatAddress(client)}
        </span>
      </TableCell>
      <TableCell>{formatCurrency(client.balance)}</TableCell>
      <TableCell>
        <Badge className={statusClasses[client.status] ?? statusClasses.inactive}>
          {client.status}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

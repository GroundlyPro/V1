import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CalendarClock, Mail, Phone } from "lucide-react";
import type { RequestListItem } from "@/lib/supabase/queries/requests";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statusClasses: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  in_review: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export function RequestCard({ request }: { request: RequestListItem }) {
  const submitted = request.created_at
    ? formatDistanceToNow(new Date(request.created_at), { addSuffix: true })
    : "Recently";

  return (
    <Link href={`/requests/${request.id}`} className="block">
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-gray-900">
                {request.first_name} {request.last_name}
              </h2>
              <Badge className={statusClasses[request.status] ?? statusClasses.new}>
                {request.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {request.service_type || "Service request"}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {request.email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {request.email}
                </span>
              ) : null}
              {request.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {request.phone}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            {submitted}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean | null;
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  office: "Office",
  field_tech: "Field tech",
};

export function TeamMembersTab({
  members,
  deactivateAction,
}: {
  members: TeamMember[];
  deactivateAction: (userId: string) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1a2d3d]">Team members</h3>
          <p className="text-sm text-muted-foreground">Manage staff access and roles.</p>
        </div>
        <InviteMemberModal />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium text-[#1a2d3d]">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabels[member.role] ?? member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active === false ? "outline" : "default"}>
                      {member.is_active === false ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending || member.role === "owner" || member.is_active === false}
                      onClick={() =>
                        startTransition(async () => {
                          await deactivateAction(member.id);
                        })
                      }
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

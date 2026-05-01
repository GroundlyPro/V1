"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  BarChart3,
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  Leaf,
  Megaphone,
  Plus,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "red" | "brand";
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/home", label: "Home", icon: LayoutDashboard },
      { href: "/schedule", label: "Schedule", icon: Calendar },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/requests", label: "Requests", icon: Inbox },
      { href: "/quotes", label: "Quotes", icon: FileText },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/marketing", label: "Marketing", icon: Megaphone },
      { href: "/insights", label: "Insights", icon: BarChart3 },
      { href: "/expenses", label: "Expenses", icon: BadgeDollarSign },
      { href: "/timesheets", label: "Timesheets", icon: Clock },
    ],
  },
];

const CREATE_ITEMS = [
  { href: "/clients/new", label: "Client", icon: Users },
  { href: "/requests/new", label: "Request", icon: Inbox },
  { href: "/quotes/new", label: "Quote", icon: FileText },
  { href: "/jobs/new", label: "Job", icon: Briefcase },
  { href: "/invoices/new", label: "Invoice", icon: Receipt },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className="sticky top-0 z-40 flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06]"
      style={{ background: "linear-gradient(175deg, #0d1c2e 0%, #091422 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
        <div
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#007bb8] to-[#0097e6] text-white"
          style={{ boxShadow: "0 0 18px 2px rgba(0,123,184,0.45)" }}
        >
          <Leaf size={20} fill="currentColor" />
        </div>
        <div className="leading-none">
          <strong className="block text-[15px] font-bold tracking-[-0.3px] text-white">
            GroundlyPRO
          </strong>
          <span className="text-[10px] font-semibold uppercase tracking-[1px] text-white/30">
            Local Services
          </span>
        </div>
      </div>

      {/* Create button */}
      <div className="mx-3.5 mb-2 mt-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #007bb8, #0097e6)",
              boxShadow: "0 2px 12px rgba(0,123,184,0.38)",
            }}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span className="flex-1 text-left">Create</span>
            <ChevronDown size={14} strokeWidth={2.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[192px]">
            {CREATE_ITEMS.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} className="cursor-pointer gap-2 px-2 py-2" onClick={() => router.push(href)}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label ? (
              <div className="px-3 pb-1 pt-3.5 text-[9.5px] font-bold uppercase tracking-[1.3px] text-white/22">
                {section.label}
              </div>
            ) : null}
            <div className="space-y-px">
              {section.items.map(({ href, label, icon: Icon, badge, badgeTone }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-[7px] px-3 py-[7px] text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-white/[0.09] text-white"
                        : "text-white/45 hover:bg-white/[0.055] hover:text-white/80"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-[7px] left-0 w-[3px] rounded-r-full bg-[#29b6f6]" />
                    )}
                    <Icon
                      size={15.5}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={isActive ? "text-[#29b6f6]" : ""}
                    />
                    <span>{label}</span>
                    {badge ? (
                      <span
                        className={cn(
                          "ml-auto min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-white",
                          badgeTone === "red" ? "bg-[#d32f2f]/75" : "bg-[#007bb8]/55"
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings footer */}
      <div className="border-t border-white/[0.06] px-2 py-3">
        <Link
          href="/settings"
          className={cn(
            "relative flex items-center gap-2.5 rounded-[7px] px-3 py-[7px] text-[13px] font-medium transition-all duration-150",
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "bg-white/[0.09] text-white"
              : "text-white/45 hover:bg-white/[0.055] hover:text-white/80"
          )}
        >
          <Settings size={15.5} strokeWidth={1.8} />
          Settings
        </Link>
      </div>
    </aside>
  );
}

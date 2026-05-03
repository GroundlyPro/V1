"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bell, Bolt, CircleHelp, MessageSquare, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TopbarProps {
  businessName?: string;
  userInitials?: string;
}

export function Topbar({ businessName = "My Business", userInitials = "U" }: TopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-4 border-b border-[#dde6ee] bg-white/80 px-6 backdrop-blur-xl"
      style={{ boxShadow: "0 1px 0 rgba(0,20,40,0.05)" }}
    >
      {/* Business name */}
      <button className="flex items-center gap-1 text-[13.5px] font-semibold text-[#1a2d3d] transition-colors duration-150 hover:text-[#007bb8]">
        {businessName}
        <span className="ml-0.5 text-[#b0c4d4] text-[10px]">&#9662;</span>
      </button>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex h-[30px] max-w-[320px] flex-1 items-center gap-2 rounded-lg border border-[#dde6ee] bg-[#f2f6fa] px-3 text-[13px] text-[#9bb0c2] transition-all duration-200 focus-within:border-[#007bb8]/40 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,123,184,0.09)]"
      >
        <Search size={13.5} className="shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[#1a2d3d] outline-none placeholder:text-[#9bb0c2]"
          placeholder="Search"
          aria-label="Search"
        />
        <kbd className="ml-auto rounded border border-[#dde6ee] bg-white px-1.5 py-[2px] font-mono text-[10px] text-[#9bb0c2] leading-none">
          /
        </kbd>
      </form>

      {/* Icon actions + avatar */}
      <div className="ml-auto flex items-center gap-0.5">
        {[
          { label: "Automations", icon: Bolt },
          { label: "Messages", icon: MessageSquare, onClick: () => router.push("/chat") },
          { label: "Notifications", icon: Bell },
          { label: "Help", icon: CircleHelp },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7a96a8] transition-all duration-150 hover:bg-[#007bb8]/[0.08] hover:text-[#007bb8]"
            title={label}
            type="button"
            onClick={onClick}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span className="sr-only">{label}</span>
          </button>
        ))}

        <div className="mx-2 h-4 w-px bg-[#dde6ee]" />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#007bb8]/50">
            <Avatar className="h-[30px] w-[30px] cursor-pointer transition-opacity duration-150 hover:opacity-80">
              <AvatarFallback
                className="text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #007bb8, #0097e6)" }}
              >
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

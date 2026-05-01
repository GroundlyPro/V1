# Master.md — Groundly PRO Build Bible

> **READ THIS FILE AT THE START OF EVERY SESSION — before touching any code.**
> **UPDATE the "Known Issues / Next Tasks" section after every session.**

---

## How to Start Every Session (minimise tokens)

```
Read Master.md.
Task: [one sentence — what to fix or build]
File: [path/to/exact/file.tsx if known]
Do not touch anything outside that file.
```

**Rules to keep sessions cheap:**
- One task per message. Never bundle multiple bugs or features.
- Always give the file path if you know it. Exploration is expensive.
- Bugs: describe what's wrong and where. Not just "it's broken".
- Features: describe what it should do, not just what it looks like.
- After session ends, update "Known Issues / Next Tasks" below so next session starts with zero exploration.

---

## What We're Building

**Growndly PRO** — field service management SaaS (cheaper Jobber alternative) for lawn care, cleaning, HVAC, plumbing, landscaping. Full workflow: **Request → Quote → Job → Invoice → Payment**.

**Demo business:** Plum Landscaping | **Owner:** Nathaniel P
**Demo clients:** Ben Cook, Robin Schneider, Kale Salad Express, Vera Lee, Bob McInnis
**Supabase Project ID:** `pnnczpsvvuwgzpkqfizv`
**Production URL:** `https://v1-groundlypro.vercel.app`
**GitHub:** `https://github.com/GroundlyPro/V1.git` → push to `main` only
**App dir:** `C:\Users\Admin\Music\Growndly\V1-master\`

---

## Tech Stack — Critical Facts

| Layer | Technology | Gotcha |
|---|---|---|
| Framework | Next.js 16.2.4 (App Router) | `middleware.ts` → renamed to `proxy.ts`, exports `proxy()` not `middleware()` |
| Language | TypeScript strict | |
| Styling | Tailwind CSS v4 | NO `tailwind.config.ts` — tokens in `app/globals.css` `@theme inline {}` |
| UI | shadcn/ui v4 + **@base-ui/react** | NOT Radix. `Button` has NO `asChild` prop. Select shows UUID if you rely on SelectValue auto-detection — render the label explicitly in the trigger instead |
| Icons | Lucide React | |
| Database | Supabase PostgreSQL + RLS | Always filter by `business_id` even though RLS is on |
| Auth | Supabase Auth | |
| Forms | react-hook-form + Zod v4 | `z.coerce.number()` causes resolver type errors with hookform v7 — use `z.number()` and convert in `onChange` |
| State | Zustand | Global UI state only |
| Email | Resend | `lib/resend.ts` |
| SMS | Twilio | `lib/twilio.ts` |
| Payments | Stripe | `lib/stripe.ts` |
| Deploy | Vercel | Auto-deploys from `main` branch |

**Brand blue:** `oklch(0.545 0.137 232)` = `#007bb8`
**Never commit `.env.local`.** Never hardcode secrets.

---

## Actual File Structure (as of 2026-05-01)

```
V1-master/
├── Master.md                            ← Read every session
├── proxy.ts                             ← Route protection (Next.js 16)
├── .env.local                           ← All secrets — never commit
│
├── app/
│   ├── globals.css                      ← Tailwind v4 brand tokens + animations
│   ├── layout.tsx                       ← Root layout, DM Sans font, PWA manifest link
│   ├── manifest.ts                      ← PWA manifest
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── onboarding/page.tsx
│   ├── booking/[businessSlug]/page.tsx  ← Public booking widget (no auth)
│   ├── (dashboard)/
│   │   ├── layout.tsx                   ← Fetches business name + user initials
│   │   ├── home/page.tsx                 ← Dashboard workflow + appointment filters (date/team)
│   │   ├── schedule/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx              ← Booking-style job creation flow
│   │   │   └── [id]/page.tsx            ← Has Labor + Expenses tabs
│   │   ├── quotes/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx            ← Send/Approve/Decline, team member display
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── requests/
│   │   │   ├── page.tsx                 ← Has "New Request" button → /requests/new
│   │   │   ├── new/page.tsx             ← Manual request creation form
│   │   │   └── [id]/page.tsx
│   │   ├── insights/page.tsx
│   │   ├── search/page.tsx              ← Global search (clients/addresses/jobs/quotes/invoices/requests)
│   │   └── settings/page.tsx            ← Tabs: Business, Team, Services, Billing, Notifications
│   └── api/
│       ├── onboarding/route.ts
│       ├── stripe/create-checkout/route.ts
│       ├── stripe/webhook/route.ts
│       ├── invoices/send/route.ts
│       ├── quotes/send/route.ts
│       ├── sms/appointment-reminder/route.ts
│       ├── requests/submit/route.ts     ← Public endpoint for booking widget
│       └── team/invite/route.ts
│
├── components/
│   ├── ui/                              ← shadcn/@base-ui components — never edit manually
│   ├── layout/
│   │   ├── Sidebar.tsx                  ← Dark navy gradient, Create dropdown, no fake badges
│   │   └── Topbar.tsx                   ← Frosted glass, global search wired up
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   ├── ClientForm.tsx
│   │   └── AddressForm.tsx
│   ├── jobs/
│   │   ├── JobForm.tsx                  ← Booking-style new job form + compact edit variant
│   │   ├── LineItemsEditor.tsx
│   │   ├── VisitCard.tsx
│   │   ├── VisitForm.tsx
│   │   ├── LaborTab.tsx
│   │   ├── ExpensesTab.tsx
│   │   ├── LogTimeModal.tsx
│   │   └── AddExpenseModal.tsx
│   ├── schedule/
│   │   ├── WeekCalendar.tsx             ← Prev/Next week+month buttons, date jump input, week/day tabs
│   │   ├── DayColumn.tsx
│   │   ├── VisitBlock.tsx
│   │   ├── AssignTechModal.tsx
│   │   └── SendSmsReminderButton.tsx
│   ├── quotes/
│   │   ├── QuoteForm.tsx                ← Client name fix (explicit trigger), team member assignment section
│   │   └── QuoteLineItemsEditor.tsx
│   ├── invoices/
│   │   ├── InvoiceForm.tsx
│   │   ├── RecordPaymentModal.tsx
│   │   └── PaymentLinkButton.tsx
│   ├── requests/
│   │   ├── RequestCard.tsx
│   │   ├── RequestForm.tsx
│   │   ├── BookingForm.tsx
│   │   └── ConvertToQuoteModal.tsx
│   ├── insights/
│   │   ├── StatCard.tsx
│   │   ├── RevenueChart.tsx
│   │   └── JobsByStatusChart.tsx
│   ├── settings/
│   │   ├── BusinessProfileForm.tsx
│   │   ├── TeamMembersTab.tsx
│   │   ├── ServicesTab.tsx
│   │   ├── NotificationsTab.tsx
│   │   └── InviteMemberModal.tsx
│   └── shared/
│       └── SendEmailModal.tsx
│
├── lib/
│   ├── resend.ts                        ← Resend client + email HTML templates
│   ├── twilio.ts                        ← Twilio client
│   ├── stripe.ts                        ← Stripe client
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       ├── admin.ts                     ← Service role client (bypasses RLS)
│       ├── types.ts                     ← Auto-generated — NEVER edit manually
│       └── queries/
│           ├── businesses.ts
│           ├── clients.ts
│           ├── jobs.ts
│           ├── schedule.ts              ← getVisitsForWeek, getScheduleTeamMembers, assignTech, rescheduleVisit
│           ├── quotes.ts                ← createQuote, updateQuote, encodeTeamInNotes, decodeTeamFromNotes
│           ├── invoices.ts
│           ├── requests.ts              ← createManualRequest, convertRequestToQuote, submitPublicRequest
│           ├── labor.ts
│           ├── expenses.ts
│           ├── insights.ts
│           └── search.ts
│
└── supabase/
    ├── migrations/                      ← 001–019 SQL files, all pushed
    └── seed.sql                         ← Plum Landscaping demo data
```

---

## Key Architectural Decisions

**Select trigger display** — `@base-ui/react` Select.Value does not reliably render item labels when value is a UUID. Always render the selected label explicitly inside `SelectTrigger`:
```tsx
<SelectTrigger>
  {selectedItem ? <span>{selectedItem.label}</span> : <SelectValue placeholder="..." />}
</SelectTrigger>
```

**Team member assignment on quotes** — Quotes table has no `assigned_to` column. Team assignment is encoded into `internal_notes` with prefix `__team__:{json}`. Use `encodeTeamInNotes` / `decodeTeamFromNotes` from `lib/supabase/queries/quotes.ts`. The detail page parses and displays the assigned member separately; the Notes tab shows only `actualNotes`.

**Booking-style job creation** — `/jobs/new` uses `components/jobs/JobForm.tsx` in `booking` mode. It can create a new client/address or use an existing client/address, then creates the `jobs` row, first `job_line_items` row, optional `job_visits` row, and optional `visit_assignments` row in one submit through `createJob()` in `lib/supabase/queries/jobs.ts`. Job detail edit uses the same component in `compact` mode to avoid re-rendering the full booking flow.

**Server actions pattern** — Server actions live inside the page file (not in query files). Query files export pure DB functions. Pages wire actions → queries → revalidatePath/redirect.

**Admin client** — Use `createAdminClient()` from `lib/supabase/admin.ts` for operations that bypass RLS (e.g., booking widget submissions, team invites).

**Job confirmations + reminders** â€” Job detail now has `Send to Client` and `Send to Cleaner` actions. These currently create internal notification structure and queue reminder rows through `sendJobConfirmation()` in `lib/supabase/queries/jobs.ts`; actual Twilio/email delivery is still pending. Reminder behavior is controlled from Settings â†’ Alerts using `job_reminders_enabled`, `job_reminder_24h`, and `job_reminder_1h` on `businesses`. Job send status is tracked on `jobs.client_confirmation_sent_at` and `jobs.cleaner_confirmation_sent_at`.

---

## DB Tables (all 28, all have RLS)

`businesses`, `users`, `clients`, `client_addresses`, `client_contacts`, `services`, `quotes`, `quote_line_items`, `jobs`, `job_line_items`, `job_visits`, `visit_assignments`, `labor_entries`, `expenses`, `invoices`, `invoice_line_items`, `payments`, `requests`, `tax_rates`, `forms`, `form_submissions`, `notifications`, `reminders`, `notes`, `chemical_treatments`, `tags`, `taggables`, `audit_logs`

**Quotes table columns** (no `assigned_to` — stored in `internal_notes`):
`id, business_id, client_id, address_id, quote_number, title, status, frequency, subtotal, total, discount_amount, tax_amount, valid_until, message_to_client, internal_notes, sent_at, approved_at, created_by, service_id, created_at, updated_at`

---

## Known Issues / Next Tasks

> Update this section at the end of every session. This is what the next session reads first.

**Fixed this session (2026-05-01):**
- Schedule: added prev/next month buttons (`ChevronsLeft/Right`) + date jump input to `WeekCalendar.tsx`
- Requests: added "New Request" button on `requests/page.tsx` → `/requests/new`
- Quotes: fixed client UUID showing in select trigger — now renders name explicitly
- Quotes: added team member assignment UI + wage input to `QuoteForm.tsx`; encode/decode via `encodeTeamInNotes`/`decodeTeamFromNotes` in `quotes.ts`; detail page shows assigned member in Quote Info card
- Sidebar: Create button is now a dropdown for Client, Request, Quote, Job, Invoice; removed hard-coded Requests/Jobs badges
- Search: global search now includes direct client/request name/email/phone/address, direct job/quote/invoice numbers/titles, and address-linked clients/jobs/quotes/invoices/requests
- Dashboard home: Appointments panel now uses real `job_visits`, links to jobs, shows customer/assigned tech/location/price, and supports date + team member filters
- Requests: `/requests/new` creates manual authenticated requests with `source = manual` and redirects to the created request detail page
- Jobs: `/jobs/new` was redesigned into a BookingKoala-style booking form wired to real clients, addresses, services, line items, first visit scheduling, team assignment, and job totals; orange tab accent removed in favor of brand blue
- Quotes: `/quotes/new` now supports initial pricing on creation through first line item fields in `QuoteForm.tsx`; `createQuote()` inserts the first `quote_line_items` row and recalculates totals in the same submit
- Invoices: fixed client/job UUIDs spilling out in `InvoiceForm.tsx` by rendering explicit labels in the select triggers
- Dashboard home: Appointments now default to `This month`, and appointment-side money totals de-duplicate repeated visits from the same job so card totals stay accurate
- Jobs: booking flow now renders explicit labels for UUID-backed selects, includes provider wage percentage in the booking payment summary, and job detail can queue `Send to Client` / `Send to Cleaner` confirmation structure plus 24h/1h reminders
- Quotes: fixed Vercel type-check failure in `QuoteForm.tsx` by aligning `react-hook-form` with Zod's coerced number input/output types for pricing fields

**Still open / to do next:**
- `lib/supabase/types.ts` needs regeneration after any new migration: run `npx supabase gen types typescript --project-id pnnczpsvvuwgzpkqfizv > lib/supabase/types.ts` (requires `supabase login` first)
- Parent folder `C:\Users\Admin\Music\Growndly\package-lock.json` causes Next.js workspace-root warning on build — delete it or set `turbopack.root` in `next.config.ts`

---

## Dev Commands

```bash
npm run dev                    # localhost:3000
npm run build                  # production build check
npm run lint                   # ESLint

# After any DB migration:
npx supabase gen types typescript --project-id pnnczpsvvuwgzpkqfizv > lib/supabase/types.ts

# Deploy:
git add -A && git commit -m "feat: [what]"
git push origin main           # Vercel auto-deploys from main
```

---

## UI Design System (locked — never regress)

**Sidebar:** `linear-gradient(175deg, #0d1c2e 0%, #091422 100%)` — dark navy. Active item: `bg-white/[0.09]` + 3px left accent `#29b6f6`. Hover: `bg-white/[0.055]`.

**Topbar:** `bg-white/80 backdrop-blur-xl` frosted glass.

**Cards:** `rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]`
Hover: `hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,20,40,0.10)]`

**Colors:**
| Role | Value |
|---|---|
| Brand blue | `#007bb8` / `oklch(0.545 0.137 232)` |
| Page bg | `oklch(0.984 0.004 232)` |
| Text primary | `#1a2d3d` |
| Text secondary | `#4a6070` |
| Text muted | `#9baab8` |
| Danger | `#d32f2f` |

**Workflow card accent colors:**
- Request: `from-[#ff9800] to-[#ffb74d]`
- Quote: `from-[#9c27b0] to-[#ce93d8]`
- Job: `from-[#007bb8] to-[#29b6f6]`
- Invoice: `from-[#1565c0] to-[#1e88e5]`

**Animations (`globals.css`):** `.animate-fade-up` (opacity+translateY, 0.48s), `.animate-fade-in` (0.35s). Stagger cards by ~60ms each.

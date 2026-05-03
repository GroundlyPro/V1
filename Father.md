# Father.md — Groundly PRO Build Bible

> **READ THIS FILE AT THE START OF EVERY SESSION — before touching any code.**
> **UPDATE the "Known Issues / Next Tasks" section after every session.**

---

## How to Start Every Session (minimise tokens)

```
Read Father.md.
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
| Email | Gmail API + Resend fallback | Gmail OAuth credentials can be stored in Settings → Integrations or env; templates in `lib/resend.ts`, provider routing in `lib/email.ts` |
| SMS / calling handoff | Quo API + Quo contact deep-link | `lib/quo.ts`, `app/api/clients/[id]/quo-contact/route.ts`, `lib/open-quo-contact.ts` |
| Payments | Stripe | `lib/stripe.ts` |
| Deploy | Vercel | Auto-deploys from `main` branch |

**Brand blue:** `oklch(0.545 0.137 232)` = `#007bb8`
**Never commit `.env.local`.** Never hardcode secrets.

---

## Actual File Structure (as of 2026-05-01)

```
V1-master/
├── Father.md                            ← Read every session
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
│   ├── quo.ts                           ← Quo SMS client
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

**Chat Additions (2026-05-03)**

```text
app/
`-- (dashboard)/
    `-- chat/page.tsx

app/api/
`-- chat/
    `-- conversations/
        |-- route.ts
        `-- [id]/
            |-- route.ts
            `-- read/route.ts

components/
`-- chat/
    `-- ChatWorkspace.tsx

lib/supabase/queries/
`-- chat.ts

supabase/migrations/
`-- 022_chat_center.sql
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

**Job confirmations + reminders** â€” Job detail now has `Send to Client` and `Send to Cleaner` actions. These currently create internal notification structure and queue reminder rows through `sendJobConfirmation()` in `lib/supabase/queries/jobs.ts`; SMS delivery uses Quo API via `lib/quo.ts`. Reminder behavior is controlled from Settings â†’ Alerts using `job_reminders_enabled`, `job_reminder_24h`, and `job_reminder_1h` on `businesses`. Job send status is tracked on `jobs.client_confirmation_sent_at` and `jobs.cleaner_confirmation_sent_at`.

**OpenPhone / Quo client actions** â€” Groundly does not programmatically start a live outbound call through Quo's public API. For client-facing call/SMS buttons, sync the Groundly client into Quo contacts and then open the Quo contact page in a new tab so the user can call or text there.
- Server route: `app/api/clients/[id]/quo-contact/route.ts`
- Quo API helper: `ensureQuoContact()` in `lib/quo.ts`
- Client opener: `openQuoContact(clientId)` in `lib/open-quo-contact.ts`
- Stable Quo external id: `groundly-client:${client.id}`
- Future SMS/call icons: do **not** wire `sms:` or `tel:` directly if the row has a Groundly client id; call `openQuoContact(clientId)` instead
- Chat inbox rule: in `/chat`, `Call` is the only client action that should open Quo externally. `Email` and `SMS` should keep the user inside the inbox and switch the active thread composer to `email` or `sms`.
- Chat send path: `/chat` client `email` uses the connected Gmail / Resend fallback pipeline, and `/chat` client `sms` uses Quo `sendQuoMessage()` from `lib/quo.ts`.
- Chat DB note: when adding chat SMS support, the database must also allow `chat_messages.delivery_type = 'sms'`; migration `023_chat_sms_delivery.sql` updates that constraint.

---

## DB Tables (all 28, all have RLS)

`businesses`, `users`, `clients`, `client_addresses`, `client_contacts`, `services`, `quotes`, `quote_line_items`, `jobs`, `job_line_items`, `job_visits`, `visit_assignments`, `labor_entries`, `expenses`, `invoices`, `invoice_line_items`, `payments`, `requests`, `tax_rates`, `forms`, `form_submissions`, `notifications`, `reminders`, `notes`, `chemical_treatments`, `tags`, `taggables`, `audit_logs`

**Quotes table columns** (no `assigned_to` — stored in `internal_notes`):
`id, business_id, client_id, address_id, quote_number, title, status, frequency, subtotal, total, discount_amount, tax_amount, valid_until, message_to_client, internal_notes, sent_at, approved_at, created_by, service_id, created_at, updated_at`

---

## Known Issues / Next Tasks

> Update this section at the end of every session. This is what the next session reads first.

**Fixed this session (2026-05-02):**
- OpenPhone / Quo client actions: client-table three-dot `Call` and `SMS` now sync the client into Quo contacts and open the Quo contact page instead of using raw `tel:` / `sms:` links; invoice row actions now use the same bridge (`app/api/clients/[id]/quo-contact/route.ts`, `lib/quo.ts`, `lib/open-quo-contact.ts`, `components/clients/ClientRowActions.tsx`, `components/invoices/InvoiceRowActions.tsx`)
- Chat: added new `/chat` dashboard tab with unified inbox UI, team rooms, client threads, unread/client/team filters, call/email actions, Supabase-backed conversations/messages/read state, and chat API routes (`app/(dashboard)/chat/page.tsx`, `components/chat/ChatWorkspace.tsx`, `lib/supabase/queries/chat.ts`, `app/api/chat/...`)
- Chat DB: added `supabase/migrations/022_chat_center.sql` for `chat_conversations`, `chat_participants`, `chat_reads`, `chat_messages`, unread sync trigger, and realtime publication hookup
- Chat hosted fix: remote `chat_conversations` now exists; chat server queries currently use `createAdminClient()` after authenticating the signed-in user so the feature is not blocked by incomplete RLS policies on the new chat tables
- Chat compatibility: `getViewerContext()` now treats missing `businesses.integrations_config` as optional so `/chat` can load even when that older hosted column migration was skipped
- Settings: added **Integrations** tab with setup/status cards for Gmail, Stripe, Quo, Google Calendar, and Resend fallback (`app/(dashboard)/settings/page.tsx`, `components/settings/IntegrationsTab.tsx`)
- SMS: replaced Twilio integration with Quo API credentials (`QUO_API_KEY`, `QUO_PHONE_NUMBER_ID`, optional `QUO_USER_ID`) and wired appointment reminder SMS through `lib/quo.ts`.
- Email sending: added Gmail API sender that uses Google OAuth env vars when fully configured, with Resend preserved as fallback (`lib/gmail.ts`, `lib/email.ts`, invoice/quote send routes). Required Gmail env names: `GOOGLE_CLIENT_ID` or `GMAIL_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` or `GMAIL_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` or `GMAIL_REFRESH_TOKEN`, and `GMAIL_FROM_EMAIL`
- Clients: client table three-dot menu has **Edit** and **Email** actions; Email opens a send dialog with subject/message/attachments and posts to `/api/clients/send-email`, which uses Gmail first and Resend fallback through `sendTransactionalEmail()`.
- Gmail verification: `.env.local` includes Google OAuth/Gmail sender keys, but the saved Google refresh token now returns `invalid_grant`; the app maps expired/revoked Gmail refresh-token failures to `Token expired` (`lib/gmail.ts`)
- Settings → Alerts tab: added **Email** section at top with reply-to address input (saves to `businesses.email`) and **Alerts** sub-header above notification toggles (`components/settings/NotificationsTab.tsx`)
- `settings/page.tsx`: `NotificationValues` now includes `email`; `updateNotifications` server action explicitly saves it to `businesses` table alongside the toggle fields
- `app/api/invoices/send/route.ts` + `app/api/quotes/send/route.ts`: both now fetch `email` alongside `name` from the business record and pass it as `reply_to` on every Resend `emails.send()` call — client replies land in the business's inbox instead of noreply

**Fixed this session (2026-05-03):**
- Chat inbox actions: client `Email` and `SMS` actions in `/chat` no longer open external tabs; they now open the client inside the inbox and switch the composer to the matching delivery mode, while `Call` still opens Quo (`components/chat/ChatWorkspace.tsx`)
- Chat SMS delivery: `/chat` now supports `deliveryType: "sms"` and sends through Quo `sendQuoMessage()` after checking the saved Quo integration config (`lib/supabase/queries/chat.ts`, `lib/quo.ts`)
- Chat integration guardrails: `/chat` now exposes whether Gmail/fallback email and Quo are connected and only offers those delivery modes when the matching integration exists (`lib/supabase/queries/chat.ts`, `components/chat/ChatWorkspace.tsx`)
- Chat DB compatibility: added `supabase/migrations/023_chat_sms_delivery.sql` so `chat_messages.delivery_type` accepts `sms`; without this hosted migration, chat SMS will still fail even if the UI looks correct
- Email delivery fallback: `sendTransactionalEmail()` now falls back to Resend when Gmail is configured but the Gmail send fails, instead of failing the entire send path for chat/client/invoice/quote email sends (`lib/email.ts`)
- Gmail token errors: Google OAuth refresh failures like `invalid_grant`, expired, or revoked tokens now surface as `Token expired` so Settings/chat email errors are explicit (`lib/gmail.ts`)
- Chat hydration fix: `/chat` message timestamps no longer use `Date.now()` during SSR; they render a stable date first and switch to relative time after hydration to avoid React hydration mismatch warnings (`components/chat/ChatWorkspace.tsx`)
- Quo SMS request fix: outgoing SMS now resolves the actual Quo/OpenPhone sending number from `GET /v1/phone-numbers/{phoneNumberId}`, ignores invalid saved `QUO_USER_ID` values that are not real `US...` user ids, and normalizes recipient numbers to E.164 before calling `POST /v1/messages` (`lib/quo.ts`)
- Quo inbound webhook setup: chat inbox webhook registration now falls back to `APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL` when `NEXT_PUBLIC_APP_URL` is blank, so deployed environments can still auto-register `/api/quo/webhooks/messages` (`lib/supabase/queries/chat.ts`)
- Quo inbound requirement: receiving replies inside `/chat` depends on the public webhook endpoint being reachable by Quo/OpenPhone; local-only dev URLs still will not receive inbound messages until exposed publicly

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
- Reports: added Grow > Report before Marketing in `Sidebar.tsx`; new `/reports` page uses `lib/supabase/queries/reports.ts` for Supabase-backed overview metrics, revenue, cashflow, lead conversion, and job performance. Verified with `npm run lint` (existing `JobForm.tsx` warning only), `npm run build`, and `http://localhost:3000/reports` returning 200.
- Clients: client detail tabs now include Requests, Quotes, Jobs, Invoices, and Notes; Jobs show scheduled date/time, assigned team members, type/frequency, status, and value.
- Quotes: `/quotes` now shows Supabase-backed overview/report cards for status counts, 30-day conversion rate, sent quote count/value, and converted quote-job count/value; no hard-coded card totals.
- Quotes/Jobs: quote detail now uses a `Convert to Job` action that reuses an existing linked job instead of duplicating it; job detail shows the source quote link when `jobs.quote_id` is present.
- Jobs: job board now shows service address and assigned team members, supports inline status changes from `/jobs`, and job detail `Job Info` also shows the assigned team.
- Quotes: quote table now shows service address and created date, and status can be changed inline with a colored dropdown from `/quotes`.
- Quotes: `/quotes` filters are URL-synced so changing one keeps the others, and custom date filtering now supports a from/to range instead of a single date.

**Still open / to do next:**
- Hosted DB drift still exists outside Chat: remote project is missing `businesses.integrations_config`, so any feature that hard-selects that column on hosted data will fail until migration `020_integrations_config.sql` is also applied remotely
- Chat should get proper RLS policies before scaling multi-tenant usage; current server-side chat path uses service-role admin client and scopes by authenticated user `business_id`
- Apply hosted migration `023_chat_sms_delivery.sql` before expecting live chat SMS sends to work on the remote database
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

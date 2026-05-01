# Master Prompt Guide

Use this file when writing requests for code changes in this repo.

Goal: reduce exploration, reduce back-and-forth, lower token waste, and get more accurate edits on the first pass.

---

## Why This Helps

A better prompt usually saves tokens overall because it removes:

- extra repo exploration
- avoidable assumptions
- follow-up questions
- wrong-file edits
- rework after the first attempt

Short version: a slightly more detailed prompt is usually cheaper than a vague prompt.

---

## Best Prompt Formula

Include these 6 things:

1. What to build or fix
2. Exact file paths if you know them
3. Constraints or rules that matter
4. What good output should look like
5. What not to touch
6. What command to run for verification

---

## Cheapest Useful Prompt

Use this for small tasks:

```md
Read Father.md.

Task: [one sentence]
Files:
- [exact file path]
- [exact file path]

Do not touch anything outside those files.
Run `npm run build` after.
```

Example:

```md
Read Father.md.

Task: Add Calendar and Map views to the Jobs page.
Files:
- app/(dashboard)/jobs/page.tsx
- components/jobs/JobsCalendarView.tsx
- components/jobs/JobsMapView.tsx
- lib/supabase/queries/jobs.ts

Do not touch anything outside those files.
Run `npm run build` after.
```

---

## Better Precision Prompt

Use this when layout, behavior, or implementation details matter:

```md
## Task
[clear outcome]

## Files to modify / create
- MODIFY: [path]
- MODIFY: [path]
- CREATE: [path]

## Constraints
- [framework rule]
- [UI rule]
- [library rule]
- [data rule]

## Behavior
- [exact expected behavior]
- [edge case]
- [loading state]
- [navigation behavior]

## Styling
- [colors / spacing / visual rules]

## Verification
- Run `npm run build`

## Scope
Do not change anything outside these files.
```

---

## Best Practice Rules

- One task per prompt.
- Give exact file paths whenever possible.
- If you already know the library, say it.
- If you already know the visual style, say it.
- If something must stay a Server Component or Client Component, say it.
- If something must not use a paid API, say it.
- If there is a required verification command, include it.
- If you want no extra exploration, explicitly say `Do not change anything outside these files.`

---

## What To Avoid

Avoid prompts like:

```md
add map and calendar to jobs
```

That usually causes extra token spend because the agent must figure out:

- which files own the feature
- whether to use server or client components
- which map library to use
- how filters should carry across views
- what the expected UI should be

---

## Repo-Specific High-Value Details

These details are worth including often because they prevent mistakes fast:

- `Next.js 16.2.4 App Router`
- `page.tsx is a Server Component unless explicitly moved`
- `Interactive components must be "use client"`
- `Tailwind v4, no tailwind.config.ts`
- `Use shadcn/ui v4 + @base-ui/react`
- `Button has no asChild prop`
- `Use Lucide React icons only`
- `Render explicit labels in SelectTrigger when values are UUIDs`
- `Filter Supabase queries by business_id`
- `Run npm run build after`

---

## Copy/Paste Templates

### Template A: Small Fix

```md
Read Father.md.

Task: [fix in one sentence]
File:
- [exact file]

Problem:
- [what is wrong now]

Expected:
- [what it should do]

Do not touch anything outside this file.
Run `npm run build` after.
```

### Template B: Feature Work

```md
Read Father.md.

## Task
[feature in one sentence]

## Files
- MODIFY: [path]
- MODIFY: [path]
- CREATE: [path if needed]

## Constraints
- [framework / library constraints]
- [UI constraints]
- [data constraints]

## Behavior
- [expected behavior 1]
- [expected behavior 2]
- [empty/loading/error state if needed]

## Scope
Do not change anything outside these files.

## Verification
Run `npm run build`.
```

### Template C: UI Change

```md
Read Father.md.

Task: Update [screen/component].

Files:
- [path]

UI requirements:
- [layout]
- [colors]
- [states]
- [mobile/desktop behavior]

Do not change logic outside this file unless required.
Run `npm run build` after.
```

---

## Best Version For This Repo

If you want strong results without writing a huge prompt every time, use this:

```md
Read Father.md.

## Task
[one clear sentence]

## Files
- MODIFY: [path]
- MODIFY: [path]
- CREATE: [path]

## Constraints
- Next.js 16 App Router
- Keep `page.tsx` as Server Component unless necessary
- Client interactivity goes in `"use client"` components
- Tailwind v4 only
- shadcn/ui + @base-ui/react only
- Lucide icons only

## Behavior
- [exact behavior]
- [state handling]
- [navigation/result]

## Scope
Do not change anything outside these files.

## Verification
Run `npm run build`.
```

---

## Prompt Quality Ladder

From worst to best:

1. `add calendar and map`
2. `add calendar and map to jobs page`
3. `add calendar and map to jobs page in app/(dashboard)/jobs/page.tsx`
4. `add calendar and map to jobs page, use these files, preserve filters, run build`
5. full scoped prompt with files, constraints, behavior, and verification

Level 4 or 5 is usually the best tradeoff.

---

## Bottom Line

Use normal English if you want. It does not need to be formal.

What matters most is:

- clear task
- exact files
- key constraints
- scope limits
- verification step

That is the highest-value prompt structure for saving tokens and avoiding rework.

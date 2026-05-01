import type { ClientFormInput } from "@/lib/supabase/queries/clients";

export const clientCsvColumns = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company_name",
  "status",
  "type",
  "street",
  "street2",
  "city",
  "state",
  "zip",
  "notes",
  "tags",
] as const;

type ClientCsvColumn = (typeof clientCsvColumns)[number];

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const nextChar = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function valueOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseRowToInput(
  row: string[],
  headerIndexes: Record<ClientCsvColumn, number>,
  rowNumber: number
): ClientFormInput {
  const get = (column: ClientCsvColumn) => row[headerIndexes[column]] ?? "";

  const firstName = get("first_name").trim();
  const lastName = get("last_name").trim();
  const street = get("street").trim();
  const city = get("city").trim();
  const state = get("state").trim();

  if (!firstName || !lastName || !street || !city || !state) {
    throw new Error(
      `Row ${rowNumber} is missing one of the required fields: first_name, last_name, street, city, state.`
    );
  }

  const status = get("status").trim() || "active";
  const type = get("type").trim() || "residential";

  if (!["active", "lead", "inactive"].includes(status)) {
    throw new Error(`Row ${rowNumber} has an invalid status "${status}".`);
  }

  if (!["residential", "commercial"].includes(type)) {
    throw new Error(`Row ${rowNumber} has an invalid type "${type}".`);
  }

  return {
    first_name: firstName,
    last_name: lastName,
    email: valueOrUndefined(get("email")),
    phone: valueOrUndefined(get("phone")),
    company_name: valueOrUndefined(get("company_name")),
    status,
    type,
    street,
    street2: valueOrUndefined(get("street2")),
    city,
    state,
    zip: valueOrUndefined(get("zip")),
    notes: valueOrUndefined(get("notes")),
    tags: valueOrUndefined(get("tags")),
  };
}

function escapeCsvCell(value: string | null | undefined) {
  const stringValue = value ?? "";
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function parseClientCsv(content: string): ClientFormInput[] {
  const rows = parseCsvRows(content).filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );

  if (rows.length < 2) {
    throw new Error("The CSV must include a header row and at least one client row.");
  }

  const headers = rows[0].map(normalizeHeader);
  const headerIndexes = {} as Record<ClientCsvColumn, number>;

  for (const column of clientCsvColumns) {
    const index = headers.indexOf(column);
    if (index === -1) {
      throw new Error(`Missing required CSV column "${column}".`);
    }
    headerIndexes[column] = index;
  }

  return rows.slice(1).map((row, index) => parseRowToInput(row, headerIndexes, index + 2));
}

export function serializeClientsCsv(
  clients: Array<
    ClientFormInput & {
      balance?: number | null;
    }
  >
) {
  const headers = [...clientCsvColumns, "balance"];
  const lines = [headers.join(",")];

  for (const client of clients) {
    const values = [
      client.first_name,
      client.last_name,
      client.email,
      client.phone,
      client.company_name,
      client.status,
      client.type,
      client.street,
      client.street2,
      client.city,
      client.state,
      client.zip,
      client.notes,
      client.tags,
      client.balance?.toString() ?? "",
    ];

    lines.push(values.map((value) => escapeCsvCell(value)).join(","));
  }

  return lines.join("\n");
}

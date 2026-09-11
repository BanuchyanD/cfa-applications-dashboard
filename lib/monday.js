const MONDAY_API_URL = "https://api.monday.com/v2";

const COLUMN_IDS = [
  "text_mm6hag40",
  "text_mm6h5wyq",
  "date_mm6hqaes",
  "date_mm6h5hee",
  "date_mm6hngp",
  "color_mm6nd0jc",
  "numeric_mm6np154",
  "numeric_mm6nxs06",
  "color_mm6nfbdf",
  "text_mm6n935r",
  "color_mm6nv6j8",
  "text_mm6n309e",
  "text_mm6n3ewq",
  "color_mm6nezz0",
  "date_mm6n6q4z",
  "color_mm6nhczt",
  "color_mm6wpbqg",
];

const ITEMS_FRAGMENT = `
  cursor
  items {
    id
    name
    column_values(ids: $columnIds) {
      id
      text
      value
    }
  }
`;

const FIRST_PAGE_QUERY = `
  query BoardApplications($boardId: [ID!], $columnIds: [String!]) {
    boards(ids: $boardId) {
      id
      name
      items_page(limit: 100) {
        ${ITEMS_FRAGMENT}
      }
    }
  }
`;

const NEXT_PAGE_QUERY = `
  query NextApplicationsPage($cursor: String!, $columnIds: [String!]) {
    next_items_page(limit: 100, cursor: $cursor) {
      ${ITEMS_FRAGMENT}
    }
  }
`;

export async function fetchMondayApplications({ token, boardId }) {
  if (!/^\d+$/.test(String(boardId))) {
    throw new Error("MONDAY_BOARD_ID must be numeric.");
  }

  const firstPage = await mondayRequest(token, FIRST_PAGE_QUERY, {
    boardId: [String(boardId)],
    columnIds: COLUMN_IDS,
  });

  const board = firstPage?.data?.boards?.[0];
  if (!board) {
    throw new Error("Board was not found or is not accessible.");
  }

  let page = board.items_page;
  const items = [...(page?.items || [])];

  while (page?.cursor) {
    const nextPage = await mondayRequest(token, NEXT_PAGE_QUERY, {
      cursor: page.cursor,
      columnIds: COLUMN_IDS,
    });

    page = nextPage?.data?.next_items_page;
    items.push(...(page?.items || []));
  }

  return {
    boardName: board.name || "Փաստաթղթերի ուսումնասիրություն",
    applications: items.map(mapMondayItem),
  };
}

async function mondayRequest(token, query, variables) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`monday.com API returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  return payload;
}

function mapMondayItem(item) {
  const columns = Object.fromEntries(
    (item.column_values || []).map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    filmTitle: item.name || "",
    registrationNumber: readText(columns.text_mm6hag40),
    applicantOrganization: readText(columns.text_mm6h5wyq),
    submittedAt: readDate(columns.date_mm6hqaes),
    applicationDeadline: readDate(columns.date_mm6h5hee),
    reviewDeadline: readDate(columns.date_mm6hngp),
    participationCount: readText(columns.color_mm6nd0jc),
    totalBudget: readNumber(columns.numeric_mm6np154),
    requestedBudget: readNumber(columns.numeric_mm6nxs06),
    competition: readText(columns.color_mm6nfbdf),
    director: readText(columns.text_mm6n935r),
    subgroup: readText(columns.color_mm6nv6j8),
    producer: readText(columns.text_mm6n309e),
    correctionStatus: readText(columns.color_mm6nezz0),
    correctionDeadline: readDate(columns.date_mm6n6q4z),
    applicationStatus: readText(columns.color_mm6nhczt),
    filmCategory: readText(columns.color_mm6wpbqg),
  };
}

function readText(column) {
  return column?.text?.trim() || "";
}

function readDate(column) {
  const parsed = parseColumnValue(column);
  return parsed?.date || column?.text || "";
}

function readNumber(column) {
  const parsed = parseColumnValue(column);
  const candidate = parsed?.number ?? parsed?.value ?? column?.text;
  if (typeof candidate === "number") return candidate;
  if (!candidate) return 0;

  const normalized = String(candidate).replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseColumnValue(column) {
  if (!column?.value) return null;

  try {
    return JSON.parse(column.value);
  } catch {
    return null;
  }
}

import { getDemoApplications } from "@/lib/demo-data";
import { fetchMondayApplications } from "@/lib/monday";

export async function getApplicationsPayload() {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID || "5102823771";
  const updatedAt = new Date().toISOString();

  if (!token) {
    return {
      source: "demo",
      boardId,
      boardName: "Փաստաթղթերի ուսումնասիրություն",
      updatedAt,
      message: "Development demo data is shown because MONDAY_API_TOKEN is not configured.",
      applications: getDemoApplications(),
    };
  }

  const result = await fetchMondayApplications({ token, boardId });

  return {
    source: "monday",
    boardId,
    boardName: result.boardName,
    updatedAt,
    applications: result.applications,
  };
}

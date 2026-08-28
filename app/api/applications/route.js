import { getApplicationsPayload } from "@/lib/applications-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getApplicationsPayload());
  } catch (error) {
    console.error("monday.com API fetch failed", error);

    return Response.json(
      {
        source: "monday",
        boardId: process.env.MONDAY_BOARD_ID || "5102823771",
        updatedAt: new Date().toISOString(),
        error: "Չհաջողվեց բեռնել monday.com տվյալները։ Ստուգեք MONDAY_API_TOKEN-ը եւ board access-ը։",
      },
      { status: 502 },
    );
  }
}

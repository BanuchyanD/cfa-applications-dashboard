import { cookies } from "next/headers";
import { getApplicationsPayload } from "@/lib/applications-service";
import { decodeFilmCategoryCookie, normalizeFilmCategory } from "@/lib/film-category";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getApplicationsPayload();
    const cookieStore = await cookies();
    const selectedCategory = decodeFilmCategoryCookie(
      cookieStore.get("cfa-film-category")?.value || "",
    );

    if (!selectedCategory) {
      return Response.json(payload);
    }

    return Response.json({
      ...payload,
      applications: (payload.applications || []).filter(
        (item) => normalizeFilmCategory(item.filmCategory) === selectedCategory,
      ),
    });
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

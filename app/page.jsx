import { cookies } from "next/headers";
import CategoryDashboard from "@/components/CategoryDashboard";
import { getApplicationsPayload } from "@/lib/applications-service";
import { decodeFilmCategoryCookie } from "@/lib/film-category";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialPayload = await getApplicationsPayload().catch(() => ({
    source: "monday",
    boardId: process.env.MONDAY_BOARD_ID || "5102823771",
    boardName: "Փաստաթղթերի ուսումնասիրություն",
    updatedAt: new Date().toISOString(),
    error: "Չհաջողվեց բեռնել monday.com տվյալները։ Ստուգեք MONDAY_API_TOKEN-ը եւ board access-ը։",
  }));

  const cookieStore = await cookies();
  const initialCategory = decodeFilmCategoryCookie(
    cookieStore.get("cfa-film-category")?.value || "",
  );

  return (
    <CategoryDashboard
      initialPayload={initialPayload}
      initialCategory={initialCategory}
    />
  );
}

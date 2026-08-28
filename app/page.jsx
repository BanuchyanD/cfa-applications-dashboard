import Dashboard from "@/components/Dashboard";
import { getApplicationsPayload } from "@/lib/applications-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialPayload = await getApplicationsPayload().catch(() => ({
    source: "monday",
    boardId: process.env.MONDAY_BOARD_ID || "5102823771",
    boardName: "Փաստաթղթերի ուսումնասիրություն",
    updatedAt: new Date().toISOString(),
    error: "Չհաջողվեց բեռնել monday.com տվյալները։ Ստուգեք MONDAY_API_TOKEN-ը եւ board access-ը։",
  }));

  return <Dashboard initialPayload={initialPayload} />;
}

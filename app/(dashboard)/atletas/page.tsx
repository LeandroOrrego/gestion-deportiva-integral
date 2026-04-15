import { getAthletes } from "@/lib/queries/atletas";
import AtletasClient from "./AtletasClient";

// ─────────────────────────────────────────────────────────────────────────────
// Server Component — fetches data, hands off to the client shell
// ─────────────────────────────────────────────────────────────────────────────

export default async function AtletasPage() {
    const athletes = await getAthletes();

    return <AtletasClient athletes={athletes} />;
}

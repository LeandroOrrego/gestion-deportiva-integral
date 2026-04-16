import { getAthletes } from "@/lib/queries/atletas";
import { getPlanteles } from "@/lib/queries/premios";
import AtletasClient from "./AtletasClient";

// ─────────────────────────────────────────────────────────────────────────────
// Server Component — fetches data, hands off to the client shell
// ─────────────────────────────────────────────────────────────────────────────

export default async function AtletasPage() {
    const [athletes, categories] = await Promise.all([
        getAthletes(),
        getPlanteles(),
    ]);

    return <AtletasClient athletes={athletes} categories={categories} />;
}

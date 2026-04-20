import { getEventos } from "@/lib/queries/eventos";
import { getCategories } from "@/lib/queries/atletas";
import EventosClient from "./EventosClient";

export default async function EventosPage() {
    const [eventos, categories] = await Promise.all([
        getEventos(),
        getCategories(),
    ]);

    return <EventosClient eventos={eventos} categories={categories} />;
}

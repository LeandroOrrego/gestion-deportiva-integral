"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EntityFilter } from "@/components/transactions/EntityFilter";

export function DeudasFilter({ entities }: { entities: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentEntidadId = searchParams.get("entidad_id") || "all";

    const handleChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val && val !== "all") {
            params.set("entidad_id", val);
        } else {
            params.delete("entidad_id");
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Filtrar por Entidad:</span>
            <EntityFilter 
                entities={entities} 
                value={currentEntidadId} 
                onChange={handleChange} 
            />
        </div>
    );
}

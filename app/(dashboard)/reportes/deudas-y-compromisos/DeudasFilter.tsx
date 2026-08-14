"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EntityFilter } from "@/components/transactions/EntityFilter";
import { CategoryFilter } from "@/components/transactions/CategoryFilter";

export function DeudasFilter({ entities, categories }: { entities: any[], categories: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentEntidadId = searchParams.get("entidad_id") || "all";
    const currentCategoryId = searchParams.get("category_id") || "all";

    const handleChange = (key: string, val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val && val !== "all") {
            params.set(key, val);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Entidad:</span>
                <EntityFilter 
                    entities={entities} 
                    value={currentEntidadId} 
                    onChange={(val) => handleChange("entidad_id", val)} 
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Categoría:</span>
                <CategoryFilter 
                    categories={categories} 
                    value={currentCategoryId} 
                    onChange={(val) => handleChange("category_id", val)} 
                />
            </div>
        </div>
    );
}

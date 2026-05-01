"use client";

import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, BarChart3 } from "lucide-react";
import JornadaTab from "@/components/reportes/JornadaTab";
import GeneralTab from "@/components/reportes/GeneralTab";

export default function ReportesPage() {
    const { profile } = useAuth();
    const orgId = profile?.organization_id || "";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Centro de Reportes</h2>
                <p className="text-muted-foreground">Análisis financiero por jornada y período.</p>
            </div>

            <Tabs defaultValue="jornada" className="w-full">
                <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-4">
                    <TabsTrigger value="jornada" className="gap-2">
                        <CalendarDays className="h-4 w-4" /> Jornada Deportiva
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2">
                        <BarChart3 className="h-4 w-4" /> Financiero General
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="jornada">
                    <JornadaTab orgId={orgId} />
                </TabsContent>
                <TabsContent value="general">
                    <GeneralTab orgId={orgId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

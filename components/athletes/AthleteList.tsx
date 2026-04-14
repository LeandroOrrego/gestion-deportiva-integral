"use client";

import { useState, useMemo } from "react";
import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    FileText,
    Users,
    ShieldCheck,
    ShieldX,
    Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Plantel = "Primera" | "Sub-19" | "Sub-16" | "Sub-15";
type DocStatus = "ok" | "falta";

interface Athlete {
    id: string;
    nombre: string;
    ci: string;
    plantel: Plantel;
    posicion: string;
    doc_pase: DocStatus;
    doc_ficha: DocStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockAthletes: Athlete[] = [
    {
        id: "1",
        nombre: "Sandro Jara",
        ci: "4.521.890",
        plantel: "Primera",
        posicion: "Delantero",
        doc_pase: "ok",
        doc_ficha: "ok",
    },
    {
        id: "2",
        nombre: "César Días Correa",
        ci: "5.112.340",
        plantel: "Primera",
        posicion: "Mediocampista",
        doc_pase: "ok",
        doc_ficha: "falta",
    },
    {
        id: "3",
        nombre: "Rodrigo Villalba",
        ci: "3.887.221",
        plantel: "Sub-19",
        posicion: "Defensor Central",
        doc_pase: "falta",
        doc_ficha: "falta",
    },
    {
        id: "4",
        nombre: "Kevin Ramírez",
        ci: "6.034.512",
        plantel: "Sub-16",
        posicion: "Arquero",
        doc_pase: "ok",
        doc_ficha: "ok",
    },
    {
        id: "5",
        nombre: "Arnaldo Esquivel",
        ci: "4.765.003",
        plantel: "Sub-19",
        posicion: "Lateral Derecho",
        doc_pase: "falta",
        doc_ficha: "ok",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const PLANTEL_COLORS: Record<Plantel, string> = {
    Primera: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    "Sub-19": "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    "Sub-16": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    "Sub-15": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
};

function PlantelBadge({ plantel }: { plantel: Plantel }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                PLANTEL_COLORS[plantel]
            )}
        >
            {plantel}
        </span>
    );
}

function DocBadge({ label, status }: { label: string; status: DocStatus }) {
    return status === "ok" ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="h-3 w-3" />
            {label}
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            <ShieldX className="h-3 w-3" />
            {label}
        </span>
    );
}

function EmptyState({ query }: { query: string }) {
    return (
        <TableRow>
            <TableCell colSpan={6} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium">
                        {query
                            ? `Sin resultados para "${query}"`
                            : "No hay atletas registrados en este plantel"}
                    </p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteListProps {
    onRegister?: () => void;
    onEdit?: (athlete: Athlete) => void;
    onViewContract?: (athlete: Athlete) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AthleteList({ onRegister, onEdit, onViewContract }: AthleteListProps) {
    const [plantelFilter, setPlantelFilter] = useState<string>("todos");
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = useMemo(() => {
        return mockAthletes.filter((a) => {
            const matchesPlantel =
                plantelFilter === "todos" || a.plantel === plantelFilter;
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                a.nombre.toLowerCase().includes(q) ||
                a.ci.replace(/\./g, "").includes(q.replace(/\./g, ""));
            return matchesPlantel && matchesSearch;
        });
    }, [plantelFilter, searchQuery]);

    return (
        <div className="space-y-5">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Plantel de Atletas
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {mockAthletes.length} jugadores registrados en el club
                    </p>
                </div>
                <Button
                    onClick={onRegister}
                    className="w-full sm:w-auto gap-2"
                    id="btn-registrar-atleta"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Atleta
                </Button>
            </div>

            {/* ── Filters ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select value={plantelFilter} onValueChange={setPlantelFilter}>
                        <SelectTrigger className="w-[150px]" id="filter-plantel">
                            <SelectValue placeholder="Plantel" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los planteles</SelectItem>
                            <SelectItem value="Primera">Primera</SelectItem>
                            <SelectItem value="Sub-19">Sub-19</SelectItem>
                            <SelectItem value="Sub-16">Sub-16</SelectItem>
                            <SelectItem value="Sub-15">Sub-15</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        id="search-atletas"
                        placeholder="Buscar por nombre o cédula..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Active filters count */}
                {(plantelFilter !== "todos" || searchQuery) && (
                    <button
                        onClick={() => {
                            setPlantelFilter("todos");
                            setSearchQuery("");
                        }}
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold text-foreground pl-5">
                                Nombre Completo
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">
                                Nro. Cédula
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">
                                Plantel
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">
                                Posición
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">
                                Documentación
                            </TableHead>
                            <TableHead className="font-semibold text-foreground text-right pr-5">
                                Acciones
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <EmptyState query={searchQuery} />
                        ) : (
                            filtered.map((athlete) => (
                                <TableRow
                                    key={athlete.id}
                                    className="group hover:bg-muted/20 transition-colors"
                                >
                                    {/* Nombre */}
                                    <TableCell className="pl-5 font-medium">
                                        <div className="flex items-center gap-2.5">
                                            {/* Avatar placeholder */}
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 select-none">
                                                {athlete.nombre
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join("")}
                                            </div>
                                            <span>{athlete.nombre}</span>
                                        </div>
                                    </TableCell>

                                    {/* CI */}
                                    <TableCell className="text-muted-foreground font-mono text-sm">
                                        {athlete.ci}
                                    </TableCell>

                                    {/* Plantel */}
                                    <TableCell>
                                        <PlantelBadge plantel={athlete.plantel} />
                                    </TableCell>

                                    {/* Posición */}
                                    <TableCell className="text-sm text-muted-foreground">
                                        {athlete.posicion}
                                    </TableCell>

                                    {/* Documentación */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <DocBadge label="Pase" status={athlete.doc_pase} />
                                            <DocBadge label="Ficha" status={athlete.doc_ficha} />
                                        </div>
                                    </TableCell>

                                    {/* Acciones */}
                                    <TableCell className="text-right pr-5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    id={`menu-${athlete.id}`}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Opciones</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                                    {athlete.nombre.split(" ")[0]}
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onEdit?.(athlete)}
                                                    className="gap-2 cursor-pointer"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Editar atleta
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => onViewContract?.(athlete)}
                                                    className="gap-2 cursor-pointer"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Ver contrato
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Footer count */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between border-t px-5 py-2.5 text-xs text-muted-foreground bg-muted/10">
                        <span>
                            Mostrando {filtered.length} de {mockAthletes.length} atletas
                        </span>
                        {plantelFilter !== "todos" && (
                            <span className="font-medium">{plantelFilter}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

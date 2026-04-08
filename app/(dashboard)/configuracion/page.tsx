
"use client";

import { useEffect, useState } from "react";
import {
    Plus,
    Pencil,
    Eye,
    EyeOff,
    Tags,
    Trophy,
    Wallet,
    BookUser,
    Building2,
    Lock,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    getTransactionTypes,
    createTransactionType,
    updateTransactionType,
    softDeleteTransactionType,
    restoreTransactionType,
} from "@/lib/queries/configuration";
import {
    getTiposEntidad,
    getEntidades,
    createEntidad,
    updateEntidad,
    deleteEntidad,
    createTipoEntidad,
    updateTipoEntidad,
} from "@/lib/queries/entidades";
import { useAuth } from "@/contexts/auth-context";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Sidebar sections ---
const sidebarSections = [
    { id: "categorias", label: "Categorías Financieras", icon: Tags, active: true },
    { id: "deportivas", label: "Categorías Deportivas", icon: Trophy, active: false },
    { id: "cuentas", label: "Cuentas / Cajas", icon: Wallet, active: false },
    { id: "entidades", label: "Entidades / Directorio", icon: BookUser, active: true },
    { id: "club", label: "Datos del Club", icon: Building2, active: false },
];

// --- Area badge helper ---
function AreaBadge({ area }: { area: string | null }) {
    if (!area) return <Badge variant="outline" className="text-xs">Sin área</Badge>;

    const styles: Record<string, string> = {
        sport: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
        admin: "bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-300",
        event: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
    };

    const labels: Record<string, string> = {
        sport: "Deportivo",
        admin: "Administrativo",
        event: "Evento",
    };

    return (
        <Badge variant="outline" className={cn("text-xs capitalize", styles[area] || "")}>
            {labels[area] || area}
        </Badge>
    );
}

// --- Status badge ---
function StatusBadge({ active }: { active: boolean }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs",
                active
                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400"
            )}
        >
            {active ? "Activo" : "Inactivo"}
        </Badge>
    );
}

export default function ConfiguracionPage() {
    const { toast } = useToast();
    const [activeSection, setActiveSection] = useState("categorias");
    const [activeTab, setActiveTab] = useState<"income" | "expense">("income");

    const { user, profile } = useAuth();
    const [types, setTypes] = useState<any[]>([]);
    const [entityTypes, setEntityTypes] = useState<any[]>([]);
    const [entities, setEntities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state - Categorías
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingType, setEditingType] = useState<any>(null);
    const [formName, setFormName] = useState("");
    const [formFlow, setFormFlow] = useState<"income" | "expense">("income");
    const [formArea, setFormArea] = useState("sport");

    // Form state - Entidades
    const [isEntityFormOpen, setIsEntityFormOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<any>(null);
    const [entityForm, setEntityForm] = useState({
        nombre: "",
        tipo_entidad_id: "",
        ruc: "",
        telefono: "",
        email: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Confirm dialog
    const [confirmAction, setConfirmAction] = useState<{ id: string; action: "deactivate" | "activate" | "delete_entity" } | null>(null);

    const loadData = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            if (activeSection === "categorias") {
                const data = await getTransactionTypes();
                setTypes(data);
            } else if (activeSection === "entidades") {
                const [tData, eData] = await Promise.all([
                    getTiposEntidad(),
                    getEntidades(profile.organization_id)
                ]);
                setEntityTypes(tData);
                setEntities(eData);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeSection, profile?.organization_id]);

    // --- Filtered data ---
    const filteredTypes = types
        .filter((t) => t.flow === activeTab)
        .sort((a, b) => {
            // Active items first
            const aActive = !a.deleted_at;
            const bActive = !b.deleted_at;
            if (aActive !== bActive) return aActive ? -1 : 1;
            return (a.nombre || "").localeCompare(b.nombre || "");
        });

    // --- Form actions ---
    const openCreate = () => {
        setEditingType(null);
        setFormName("");
        setFormFlow(activeTab);
        setFormArea("sport");
        setIsFormOpen(true);
    };

    const openEdit = (type: any) => {
        setEditingType(type);
        setFormName(type.nombre);
        setFormFlow(type.flow);
        setFormArea(type.area || "sport");
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            toast({ title: "Error", description: "El nombre es requerido.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingType) {
                await updateTransactionType(editingType.id, {
                    nombre: formName.trim(),
                    area: formArea,
                });
                toast({ title: "Éxito", description: "Categoría actualizada correctamente." });
            } else {
                await createTransactionType({
                    nombre: formName.trim(),
                    flow: formFlow,
                    area: formArea,
                });
                toast({ title: "Éxito", description: "Categoría creada correctamente." });
            }
            setIsFormOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar la categoría.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.action === "deactivate") {
                await softDeleteTransactionType(confirmAction.id);
                toast({ title: "Desactivada", description: "Categoría desactivada correctamente." });
            } else if (confirmAction.action === "activate") {
                await restoreTransactionType(confirmAction.id);
                toast({ title: "Activada", description: "Categoría activada correctamente." });
            } else if (confirmAction.action === "delete_entity") {
                await deleteEntidad(confirmAction.id);
                toast({ title: "Eliminada", description: "Entidad eliminada correctamente." });
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo realizar la acción.", variant: "destructive" });
        } finally {
            setConfirmAction(null);
        }
    };

    // --- Entity Form Actions ---
    const openCreateEntity = () => {
        setEditingEntity(null);
        setEntityForm({
            nombre: "",
            tipo_entidad_id: entityTypes[0]?.id || "",
            ruc: "",
            telefono: "",
            email: "",
        });
        setIsEntityFormOpen(true);
    };

    const openEditEntity = (entity: any) => {
        setEditingEntity(entity);
        setEntityForm({
            nombre: entity.nombre,
            tipo_entidad_id: entity.tipo_entidad_id,
            ruc: entity.ruc || "",
            telefono: entity.telefono || "",
            email: entity.email || "",
        });
        setIsEntityFormOpen(true);
    };

    const handleSaveEntity = async () => {
        if (!entityForm.nombre.trim() || !entityForm.tipo_entidad_id) {
            toast({ title: "Error", description: "Nombre y Tipo son requeridos.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingEntity) {
                await updateEntidad(editingEntity.id, {
                    ...entityForm,
                    nombre: entityForm.nombre.trim(),
                });
                toast({ title: "Éxito", description: "Entidad actualizada correctamente." });
            } else {
                await createEntidad({
                    ...entityForm,
                    nombre: entityForm.nombre.trim(),
                    organization_id: profile!.organization_id!,
                });
                toast({ title: "Éxito", description: "Entidad creada correctamente." });
            }
            setIsEntityFormOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar la entidad.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredEntities = entities.filter(e => 
        e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.ruc && e.ruc.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
                <p className="text-muted-foreground">
                    Administra las categorías, cuentas y datos del club.
                </p>
            </div>

            {/* Main layout: sidebar + content */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <nav className="w-full md:w-64 shrink-0">
                    <div className="rounded-xl border bg-card p-2 space-y-1">
                        {sidebarSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => section.active && setActiveSection(section.id)}
                                disabled={!section.active}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                                    section.active && activeSection === section.id
                                        ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
                                        : section.active
                                            ? "text-foreground hover:bg-muted"
                                            : "text-muted-foreground/50 cursor-not-allowed"
                                )}
                            >
                                <section.icon className="h-4 w-4 shrink-0" />
                                <span className="flex-1">{section.label}</span>
                                {!section.active && (
                                    <Lock className="h-3 w-3 text-muted-foreground/40" />
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {activeSection === "categorias" && (
                        <div className="space-y-4">
                            {/* Tab header + button */}
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex rounded-lg border bg-card p-1 gap-1">
                                    <button
                                        onClick={() => setActiveTab("income")}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "income"
                                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Ingresos
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("expense")}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "expense"
                                                ? "bg-red-500/15 text-red-700 dark:text-red-400 shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Egresos
                                    </button>
                                </div>
                                <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-primary/90">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Categoría
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="rounded-xl border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[45%]">Nombre</TableHead>
                                            <TableHead>Área</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    Cargando categorías...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredTypes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron categorías de {activeTab === "income" ? "ingresos" : "egresos"}.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTypes.map((type) => {
                                                const isActive = !type.deleted_at;
                                                return (
                                                    <TableRow
                                                        key={type.id}
                                                        className={cn(
                                                            !isActive && "opacity-40"
                                                        )}
                                                    >
                                                        <TableCell className="font-medium">{type.nombre}</TableCell>
                                                        <TableCell>
                                                            <AreaBadge area={type.area} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge active={isActive} />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                                    onClick={() => openEdit(type)}
                                                                    title="Editar"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                {isActive ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                                                        onClick={() => setConfirmAction({ id: type.id, action: "deactivate" })}
                                                                        title="Desactivar"
                                                                    >
                                                                        <EyeOff className="h-4 w-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                                                        onClick={() => setConfirmAction({ id: type.id, action: "activate" })}
                                                                        title="Activar"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Summary */}
                            {!loading && (
                                <p className="text-xs text-muted-foreground text-right">
                                    {filteredTypes.filter(t => !t.deleted_at).length} activas
                                    {filteredTypes.filter(t => t.deleted_at).length > 0 &&
                                        ` · ${filteredTypes.filter(t => t.deleted_at).length} inactivas`
                                    }
                                </p>
                            )}
                        </div>
                    )}

                    {activeSection === "entidades" && (
                        <div className="space-y-4">
                            {/* Search + Button */}
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative w-full sm:w-72">
                                    <Input
                                        placeholder="Buscar por nombre o RUC..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-3"
                                    />
                                </div>
                                <Button onClick={openCreateEntity} className="bg-brand-primary hover:bg-brand-primary/90">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Entidad
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="rounded-xl border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre / Razón</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    Cargando directorio...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredEntities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron entidades.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredEntities.map((entity) => (
                                                <TableRow key={entity.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{entity.nombre}</span>
                                                            {entity.ruc && (
                                                                <span className="text-xs text-muted-foreground">RUC: {entity.ruc}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="font-normal">
                                                                {entity.tipo_entidades?.nombre || "Sin tipo"}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs">
                                                            <span>{entity.telefono || "-"}</span>
                                                            <span className="text-muted-foreground">{entity.email || ""}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                                                onClick={() => openEditEntity(entity)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                                                onClick={() => setConfirmAction({ id: entity.id, action: "delete_entity" })}
                                                            >
                                                                <EyeOff className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Form Sheet (Drawer) --- */}
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>
                            {editingType ? "Editar Categoría" : "Nueva Categoría"}
                        </SheetTitle>
                        <SheetDescription>
                            {editingType
                                ? "Modificá el nombre y área de la categoría. El tipo (ingreso/egreso) no se puede cambiar."
                                : "Creá una nueva categoría financiera para clasificar transacciones."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-5">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Nombre</Label>
                            <Input
                                id="cat-name"
                                placeholder="Ej: Pago de árbitros"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                            />
                        </div>

                        {/* Flow toggle */}
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            {editingType ? (
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className={cn(
                                        "font-medium",
                                        editingType.flow === "income" ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {editingType.flow === "income" ? "Ingreso" : "Egreso"}
                                    </span>
                                    <span className="text-muted-foreground text-xs ml-auto">No editable</span>
                                </div>
                            ) : (
                                <div className="flex rounded-lg border p-1 gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "flex-1 h-9 text-sm transition-all",
                                            formFlow === "income"
                                                ? "bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/30 dark:text-emerald-400"
                                                : "text-muted-foreground hover:bg-transparent"
                                        )}
                                        onClick={() => setFormFlow("income")}
                                    >
                                        Ingreso
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "flex-1 h-9 text-sm transition-all",
                                            formFlow === "expense"
                                                ? "bg-red-500/20 text-red-700 border border-red-500/30 hover:bg-red-500/30 dark:text-red-400"
                                                : "text-muted-foreground hover:bg-transparent"
                                        )}
                                        onClick={() => setFormFlow("expense")}
                                    >
                                        Egreso
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Area select */}
                        <div className="space-y-2">
                            <Label>Área</Label>
                            <Select value={formArea} onValueChange={setFormArea}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar área" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sport">Deportivo</SelectItem>
                                    <SelectItem value="admin">Administrativo</SelectItem>
                                    <SelectItem value="event">Evento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <SheetFooter className="mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting || !formName.trim()}
                            className="bg-brand-primary hover:bg-brand-primary/90"
                        >
                            {isSubmitting ? "Guardando..." : editingType ? "Actualizar" : "Crear"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* --- Entity Form Sheet --- */}
            <Sheet open={isEntityFormOpen} onOpenChange={setIsEntityFormOpen}>
                <SheetContent className="sm:max-w-[480px] w-full p-0 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
                    <div className="h-full flex flex-col bg-slate-50/30 dark:bg-slate-950/30 backdrop-blur-xl">
                        {/* Premium Header with Glass Effect */}
                        <div className="px-8 py-10 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden backdrop-blur-md">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-blue-500 to-brand-primary animate-gradient-x" />
                            
                            <SheetHeader className="relative z-10 text-left">
                                <SheetTitle className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                                    {editingEntity ? "Editar Entidad" : "Nueva Entidad"}
                                </SheetTitle>
                                <SheetDescription className="text-slate-500 dark:text-slate-400 mt-2 text-base leading-relaxed">
                                    Completa la información del directorio para gestionar sus transacciones y tratos.
                                </SheetDescription>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-10">
                            <div className="space-y-8 max-w-md mx-auto">
                                {/* Section: Básicos */}
                                <div className="space-y-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="entity-name" className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                            Nombre / Razón Social
                                        </Label>
                                        <Input
                                            id="entity-name"
                                            value={entityForm.nombre}
                                            onChange={(e) => setEntityForm({ ...entityForm, nombre: e.target.value })}
                                            placeholder="Ej: Arnaldo Encina"
                                            className="h-14 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-brand-primary/10 transition-all font-semibold text-lg"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                            Tipo de Entidad
                                        </Label>
                                        <Select 
                                            value={entityForm.tipo_entidad_id} 
                                            onValueChange={(val) => setEntityForm({ ...entityForm, tipo_entidad_id: val })}
                                        >
                                            <SelectTrigger className="h-14 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-brand-primary/10 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 text-lg">
                                                <SelectValue placeholder="Seleccionar tipo..." />
                                            </SelectTrigger>
                                            <SelectContent 
                                                position="popper" 
                                                sideOffset={8} 
                                                className="z-[200] min-w-[var(--radix-select-trigger-width)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2"
                                            >
                                                {entityTypes.length === 0 ? (
                                                    <div className="p-6 text-center">
                                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <BookUser className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                        <p className="text-sm text-slate-500 font-medium mb-4">No hay tipos configurados</p>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="rounded-lg text-brand-primary border-brand-primary/20 hover:bg-brand-primary/5"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveSection("entidades");
                                                            }}
                                                        >
                                                            Configurar Tipos
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    entityTypes.map(t => (
                                                        <SelectItem key={t.id} value={t.id} className="cursor-pointer rounded-xl h-12 px-4 focus:bg-brand-primary/10 focus:text-brand-primary font-medium transition-colors">
                                                            {t.nombre}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-2" />

                                {/* Section: Detalles */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="entity-ruc" className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                                RUC (Opcional)
                                            </Label>
                                            <Input
                                                id="entity-ruc"
                                                value={entityForm.ruc}
                                                onChange={(e) => setEntityForm({ ...entityForm, ruc: e.target.value })}
                                                placeholder="80012345-0"
                                                className="h-12 rounded-xl border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label htmlFor="entity-tel" className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                                Teléfono
                                            </Label>
                                            <Input
                                                id="entity-tel"
                                                value={entityForm.telefono}
                                                onChange={(e) => setEntityForm({ ...entityForm, telefono: e.target.value })}
                                                placeholder="0981..."
                                                className="h-12 rounded-xl border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="entity-email" className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                            Email / Correo
                                        </Label>
                                        <Input
                                            id="entity-email"
                                            type="email"
                                            value={entityForm.email}
                                            onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })}
                                            placeholder="ejemplo@clubnaranjal.com"
                                            className="h-12 rounded-xl border-slate-200 dark:border-slate-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Premium Sticky Footer */}
                        <div className="px-8 py-8 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200/50 dark:border-slate-800/50 mt-auto backdrop-blur-md">
                            <SheetFooter className="gap-4 sm:gap-0 flex-row">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setIsEntityFormOpen(false)} 
                                    disabled={isSubmitting}
                                    className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleSaveEntity} 
                                    disabled={isSubmitting || !entityForm.nombre.trim()}
                                    className="flex-[1.5] h-14 rounded-2xl font-extrabold text-lg bg-brand-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--brand-primary-rgb),0.3)] hover:shadow-[0_15px_30px_-5px_rgba(var(--brand-primary-rgb),0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : editingEntity ? (
                                        "Actualizar Datos"
                                    ) : (
                                        "Crear Entidad"
                                    )}
                                </Button>
                            </SheetFooter>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* --- Confirm Dialog --- */}
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.action === "deactivate" ? "¿Desactivar categoría?" : 
                             confirmAction?.action === "activate" ? "¿Activar categoría?" :
                             "¿Eliminar entidad?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.action === "delete_entity" 
                                ? "Esta acción ocultará la entidad del directorio. Las transacciones pasadas se mantendrán."
                                : "La acción no se puede deshacer."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus}>
                            Aceptar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

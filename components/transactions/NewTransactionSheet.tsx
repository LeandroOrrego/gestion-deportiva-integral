'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ConceptoFinanza } from '@/types';

export function NewTransactionSheet() {
    const { role } = useUserRole();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [concepts, setConcepts] = useState<ConceptoFinanza[]>([]);

    // Filtered concepts based on selected type
    const [selectedType, setSelectedType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');

    const [formData, setFormData] = useState({
        monto: '',
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0],
        concepto_id: '',
    });

    // Fetch concepts on mount
    useEffect(() => {
        async function fetchConcepts() {
            const { data, error } = await supabase
                .from('conceptos_finanzas')
                .select('*')
                .order('nombre', { ascending: true });

            if (data) setConcepts(data);
            if (error) console.error("Error loading concepts:", error);
        }

        if (open) fetchConcepts();
    }, [open]);

    const handleScan = () => {
        console.log('Iniciar escaneo');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

        try {
            // Need a valid user_id. For now using a hardcoded UUID or NULL if allowed.
            // Ideally fetched from auth. 
            // User schema shows user_id in transacciones.

            const { error } = await supabase
                .from('transacciones')
                .insert([
                    {
                        monto: parseFloat(formData.monto),
                        descripcion: formData.descripcion,
                        fecha: formData.fecha,
                        concepto_id: parseInt(formData.concepto_id),
                        // user_id: ??? (Leave null or Supabase auth automatically handles it if default value?)
                        // If RLS is on and insert policy uses auth.uid(), we need to be logged in.
                        // For now assuming anon key allows insert or public policy.
                    },
                ]);

            if (error) throw error;

            setOpen(false);
            setFormData({
                monto: '',
                descripcion: '',
                fecha: new Date().toISOString().split('T')[0],
                concepto_id: '',
            });
            router.refresh();
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('Error saving transaction');
        } finally {
            setLoading(false);
        }
    };

    if (role === 'OBSERVADOR') {
        return (
            <Button disabled variant="outline" className="opacity-50 cursor-not-allowed">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
            </Button>
        );
    }

    // Filter concepts by selected type
    const filteredConcepts = concepts.filter(c => c.tipo === selectedType);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col h-full sm:max-w-[540px]">
                <SheetHeader>
                    <SheetTitle>Registrar Transacción</SheetTitle>
                    <SheetDescription>
                        Seleccione el concepto y complete los detalles.
                    </SheetDescription>
                </SheetHeader>

                {/* AI Scan Button */}
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100 transition-all duration-300"
                        onClick={handleScan}
                    >
                        <Sparkles className="mr-2 h-4 w-4 text-indigo-600 animate-pulse" />
                        ✨ Escanear Recibo (IA)
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 mt-6 overflow-y-auto px-1">
                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Operación</Label>
                        <div className="flex gap-2 p-1 bg-muted rounded-lg">
                            <Button
                                type="button"
                                variant={selectedType === 'INGRESO' ? 'default' : 'ghost'}
                                className={`flex-1 ${selectedType === 'INGRESO' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => {
                                    setSelectedType('INGRESO');
                                    setFormData({ ...formData, concepto_id: '' });
                                }}
                            >
                                Ingreso
                            </Button>
                            <Button
                                type="button"
                                variant={selectedType === 'EGRESO' ? 'default' : 'ghost'}
                                className={`flex-1 ${selectedType === 'EGRESO' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                onClick={() => {
                                    setSelectedType('EGRESO');
                                    setFormData({ ...formData, concepto_id: '' });
                                }}
                            >
                                Egreso
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="concepto">Concepto</Label>
                        <Select
                            value={formData.concepto_id}
                            onValueChange={(val) => setFormData({ ...formData, concepto_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar concepto..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredConcepts.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.nombre}
                                    </SelectItem>
                                ))}
                                {filteredConcepts.length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        No hay conceptos cargados para {selectedType.toLowerCase()}.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="monto">Monto (Gs.)</Label>
                        <Input
                            id="monto"
                            type="number"
                            placeholder="0"
                            required
                            value={formData.monto}
                            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fecha">Fecha</Label>
                        <Input
                            id="fecha"
                            type="date"
                            required
                            value={formData.fecha}
                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción / Notas (Opcional)</Label>
                        <Input
                            id="descripcion"
                            placeholder="Detalles adicionales..."
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>
                </form>

                <SheetFooter className="mt-auto pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-primary">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

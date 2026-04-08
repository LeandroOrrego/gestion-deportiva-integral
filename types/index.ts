export interface ConceptoFinanza {
    id: number;
    nombre: string;
    tipo: 'INGRESO' | 'EGRESO';
}

export interface Transaction {
    id: number;
    created_at?: string;
    monto: number;
    descripcion: string; // User description
    fecha: string;
    concepto_id: number;
    // Joined fields
    concepto?: ConceptoFinanza;
}

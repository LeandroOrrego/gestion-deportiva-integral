
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno de Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTransactionTypes() {
    console.log('Sembrando tipos de transacción...');

    // 1. Obtener la primera organización (asumiendo single tenant por ahora o seleccionando una para sembrar)
    // En una app multi-tenant real, podríamos querer sembrar para una org específica o para todas.
    // Intentemos obtener la org del perfil del usuario si es posible, o simplemente elija la primera encontrada.
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id').limit(1);

    if (orgError) {
        console.error('Error al obtener organizaciones:', orgError);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.error('No se encontraron organizaciones. Por favor cree una organización primero.');
        return;
    }

    const organizationId = orgs[0].id; // Usar la primera organización encontrada
    console.log(`Sembrando para ID de organización: ${organizationId}`);

    const types = [
        // Ingresos
        { nombre: 'Cuota Social', flow: 'income', organization_id: organizationId },
        { nombre: 'Cuota Deportiva', flow: 'income', organization_id: organizationId },
        { nombre: 'Patrocinios', flow: 'income', organization_id: organizationId },
        { nombre: 'Entradas de Eventos', flow: 'income', organization_id: organizationId },
        { nombre: 'Venta de Uniformes', flow: 'income', organization_id: organizationId },
        { nombre: 'Donaciones', flow: 'income', organization_id: organizationId },
        { nombre: 'Otros Ingresos', flow: 'income', organization_id: organizationId },

        // Egresos
        { nombre: 'Pago a Entrenadores', flow: 'expense', organization_id: organizationId },
        { nombre: 'Alquiler de Canchas', flow: 'expense', organization_id: organizationId },
        { nombre: 'Compra de Materiales', flow: 'expense', organization_id: organizationId },
        { nombre: 'Mantenimiento', flow: 'expense', organization_id: organizationId },
        { nombre: 'Servicios Básicos (Luz/Agua)', flow: 'expense', organization_id: organizationId },
        { nombre: 'Transporte', flow: 'expense', organization_id: organizationId },
        { nombre: 'Refrigerios/Hidratación', flow: 'expense', organization_id: organizationId },
        { nombre: 'Publicidad y Marketing', flow: 'expense', organization_id: organizationId },
        { nombre: 'Gastos Administrativos', flow: 'expense', organization_id: organizationId },
        { nombre: 'Otros Egresos', flow: 'expense', organization_id: organizationId },
    ];

    // Verificar si los tipos ya existen para evitar duplicados
    const { data: existingTypes } = await supabase
        .from('transaction_types')
        .select('nombre')
        .eq('organization_id', organizationId);

    const existingNames = new Set(existingTypes?.map(t => t.nombre));

    const newTypes = types.filter(t => !existingNames.has(t.nombre));

    if (newTypes.length === 0) {
        console.log('Todos los tipos de transacción ya existen.');
        return;
    }

    const { error } = await supabase.from('transaction_types').insert(newTypes);

    if (error) {
        console.error('Error al insertar tipos de transacción:', error);
    } else {
        console.log(`Insertados exitosamente ${newTypes.length} tipos de transacción.`);
    }
}

seedTransactionTypes();

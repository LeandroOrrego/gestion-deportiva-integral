const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan las variables de entorno.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const CSV_FILE = 'datos_2025.csv';

// Mapa para normalizar nombres de columnas del CSV a variables internas
// Ajustar según los headers reales del CSV
const COL_MAPPING = {
    fecha: ['Fecha_Movimiento', 'fecha_movimiento', 'Fecha'],
    monto: ['Monto', 'monto', 'Importe'],
    categoria: ['Categoria', 'categoria', 'Concepto'],
    tipo: ['Tipo_Movimiento', 'tipo_movimiento', 'Tipo'],
    descripcion: ['Descripción', 'descripcion', 'Razón', 'razon', 'Detalle'],
    obs: ['Observacion', 'obs'] // Opcional
};

function getValue(row, possibleKeys) {
    for (const key of possibleKeys) {
        if (row[key] !== undefined) return row[key];
    }
    return null;
}

// Convertir 'DD/MM/YYYY' a 'YYYY-MM-DD'
function parseDate(dateStr) {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();

    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) return cleanStr;

    const parts = cleanStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return null;
}

function parseMonto(montoStr) {
    if (!montoStr) return 0;
    // Eliminar puntos de mil, dejar coma decimal si existe, o manejar formato local
    // Asumiendo formato "1.500.000" (sin decimales) o "1.500.000,00"
    let clean = montoStr.toString().replace(/\./g, ''); // Quitar puntos de miles "1500000"
    clean = clean.replace(/,/g, '.'); // Cambiar coma decimal por punto si es necesario
    return parseFloat(clean);
}

// Caché básica para no consultar Conceptos repetidamente
const conceptCache = new Map();

async function getOrCreateConcept(nombre, tipoRaw) {
    if (!nombre) nombre = 'Sin Categoría';

    // Normalizar Tipo (INGRESO / EGRESO)
    let tipo = 'EGRESO'; // Default
    if (tipoRaw) {
        const t = tipoRaw.toLowerCase();
        if (t.includes('ingreso')) tipo = 'INGRESO';
    }

    const cacheKey = `${nombre}-${tipo}`;
    if (conceptCache.has(cacheKey)) return conceptCache.get(cacheKey);

    // 1. Buscar
    const { data: existing } = await supabase
        .from('conceptos_finanzas')
        .select('id')
        .eq('nombre', nombre)
        .single();

    if (existing) {
        conceptCache.set(cacheKey, existing.id);
        return existing.id;
    }

    // 2. Crear
    const { data: created, error } = await supabase
        .from('conceptos_finanzas')
        .insert([{ nombre, tipo }])
        .select('id')
        .single();

    if (error) {
        // Retry por si concurrency
        const { data: retry } = await supabase.from('conceptos_finanzas').select('id').eq('nombre', nombre).single();
        if (retry) {
            conceptCache.set(cacheKey, retry.id);
            return retry.id;
        }
        console.error(`Error creando concepto ${nombre}:`, error.message);
        return null;
    }

    conceptCache.set(cacheKey, created.id);
    return created.id;
}

async function processBatch(rows) {
    // Procesar por lotes para velocidad, pero manteniendo integridad
    for (const row of rows) {
        const rawDate = getValue(row, COL_MAPPING.fecha);
        const rawMonto = getValue(row, COL_MAPPING.monto);
        const rawCat = getValue(row, COL_MAPPING.categoria);
        const rawTipo = getValue(row, COL_MAPPING.tipo);
        const rawDesc = getValue(row, COL_MAPPING.descripcion); // "Razón" es mejor
        const rawDetalle = row['Descripción'] || row['descripcion'] || ''; // Extra detalle

        // Validar datos mínimos
        if (!rawDate || !rawMonto) continue;

        const fecha = parseDate(rawDate);
        const monto = parseMonto(rawMonto);

        if (!fecha || isNaN(monto)) {
            console.warn(`Fila inválida omitida: ${rawDate} | ${rawMonto}`);
            continue;
        }

        // Obtener concepto
        const conceptoId = await getOrCreateConcept(rawCat || 'Varios', rawTipo);

        if (conceptoId) {
            // Construir descripción rica
            let descripcionFinal = rawDesc || '';
            if (rawDetalle && rawDetalle !== rawDesc) {
                descripcionFinal += ` - ${rawDetalle}`;
            }

            // Insertar transacción
            const { error } = await supabase
                .from('transacciones')
                .insert([{
                    fecha: fecha,
                    monto: monto,
                    descripcion: descripcionFinal.trim(),
                    concepto_id: conceptoId
                }]);

            if (error) console.error(`Error insertando transaccion del ${fecha}:`, error.message);
        }
    }
}

function runMigration() {
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`Falta ${CSV_FILE}`);
        return;
    }

    console.log('Iniciando migración CORRECTA (Filas)...');
    const rows = [];
    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', async () => {
            console.log(`Leídas ${rows.length} filas. Procesando...`);
            await processBatch(rows);
            console.log('✅ Migración finalizada.');
        });
}

runMigration();

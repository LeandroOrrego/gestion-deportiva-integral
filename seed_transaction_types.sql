
-- Insertar tipos de transacción si no existen
DO $$
DECLARE
    org_id uuid;
BEGIN
    -- Obtener el ID de la primera organización encontrada
    SELECT id INTO org_id FROM organizations LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- Tipos de Ingreso
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Cuota Social' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Cuota Social', 'income', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Cuota Deportiva' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Cuota Deportiva', 'income', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Patrocinios' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Patrocinios', 'income', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Entradas de Eventos' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Entradas de Eventos', 'income', org_id);
        END IF;
         IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Venta de Uniformes' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Venta de Uniformes', 'income', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Donaciones' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Donaciones', 'income', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Otros Ingresos' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Otros Ingresos', 'income', org_id);
        END IF;

        -- Tipos de Egreso
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Pago a Entrenadores' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Pago a Entrenadores', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Alquiler de Canchas' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Alquiler de Canchas', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Compra de Materiales' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Compra de Materiales', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Mantenimiento' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Mantenimiento', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Servicios Básicos (Luz/Agua)' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Servicios Básicos (Luz/Agua)', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Transporte' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Transporte', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Refrigerios/Hidratación' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Refrigerios/Hidratación', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Publicidad y Marketing' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Publicidad y Marketing', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Gastos Administrativos' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Gastos Administrativos', 'expense', org_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM transaction_types WHERE nombre = 'Otros Egresos' AND organization_id = org_id) THEN
            INSERT INTO transaction_types (nombre, flow, organization_id) VALUES ('Otros Egresos', 'expense', org_id);
        END IF;
        
    END IF;
END $$;

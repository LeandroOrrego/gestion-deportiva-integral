-- Agregar políticas de UPDATE y DELETE para transacciones
DROP POLICY IF EXISTS "trans_update" ON public.transacciones;
CREATE POLICY "trans_update" ON public.transacciones
  FOR UPDATE USING (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  )
  WITH CHECK (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );

DROP POLICY IF EXISTS "trans_delete" ON public.transacciones;
CREATE POLICY "trans_delete" ON public.transacciones
  FOR DELETE USING (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );

-- Asegurar que get_my_org_id() y get_my_role() son accesibles
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

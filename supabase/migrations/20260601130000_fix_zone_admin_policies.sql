-- Corrige policies de admin do módulo de zonas (20260528_service_zones.sql)
-- que checavam auth.jwt()->>'role' em vez de public.is_admin().
--
-- Achado na auditoria de RLS da Fase 6 (ver /MIGRATION.md): não existe hook
-- de custom access token neste projeto, então auth.jwt()->>'role' nunca
-- reflete o role de public.profiles — sempre resolve para o role do
-- Postgres (ex.: "authenticated"), nunca "admin". Na prática, um admin
-- logado no app nunca conseguia gerenciar zonas/blocklist diretamente pelo
-- client; só via service_role (ex.: dentro de uma Edge Function). O resto
-- do schema usa public.is_admin() (consulta public.profiles), que é a
-- forma correta e consistente já usada em todas as outras tabelas.

DROP POLICY IF EXISTS "zone_cities_admin_all" ON public.zone_cities;
CREATE POLICY "zone_cities_admin_all"
  ON public.zone_cities FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "zone_neighborhoods_admin_all" ON public.zone_neighborhoods;
CREATE POLICY "zone_neighborhoods_admin_all"
  ON public.zone_neighborhoods FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "zone_blocklist_admin_all" ON public.zone_blocklist;
CREATE POLICY "zone_blocklist_admin_all"
  ON public.zone_blocklist FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "coverage_requests_admin_all" ON public.service_coverage_requests;
CREATE POLICY "coverage_requests_admin_all"
  ON public.service_coverage_requests FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

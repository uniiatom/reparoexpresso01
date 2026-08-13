-- Corrige gap encontrado na Fase 6 estendida: `tickets`/`ticket_messages`
-- só tinham policy de staff (`is_staff()`), sem exceção pro cliente/
-- prestador dono do ticket. Isso combinado com o fato de
-- `ClientTicketForm.jsx`/`ProviderTicketForm.jsx` no legado ainda chamarem
-- `base44.entities.Ticket.create()` (backend Base44 antigo, hoje
-- desativado — `VITE_BASE44_APP_ID=disabled`) significa que abrir um
-- ticket pelo lado cliente/prestador está quebrado até no app legado.
--
-- Aqui adicionamos a exceção de dono, no mesmo padrão já usado em todas as
-- outras tabelas "owner-based" do schema (ex.: clients_access,
-- favorites_access, chat_messages_access).

DROP POLICY IF EXISTS tickets_staff ON public.tickets;
CREATE POLICY tickets_access ON public.tickets FOR ALL TO authenticated
  USING (
    public.is_staff()
    OR client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = tickets.provider_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_staff()
    OR client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = tickets.provider_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS ticket_messages_staff ON public.ticket_messages;
CREATE POLICY ticket_messages_access ON public.ticket_messages FOR ALL TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND (
          t.client_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = t.provider_id AND p.user_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND (
          t.client_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = t.provider_id AND p.user_id = auth.uid())
        )
    )
  );

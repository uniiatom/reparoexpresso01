import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminOrService } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireAdminOrService(req);
    if ('error' in auth) return (auth as { error: Response }).error;

    const body = await req.json();
    const { action } = body;
    const supabase = getServiceClient();

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ users: data ?? [] });
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const email     = String(body.email      ?? '').trim().toLowerCase();
      const password  = String(body.password   ?? '');
      const fullName  = String(body.full_name  ?? '').trim();
      const role      = String(body.role       ?? 'user');
      const phone     = body.phone ? String(body.phone).trim() : null;

      if (!email)                        return jsonResponse({ error: 'Informe o e-mail.' }, 400);
      if (!password || password.length < 6) return jsonResponse({ error: 'Senha deve ter ao menos 6 caracteres.' }, 400);
      if (!fullName)                     return jsonResponse({ error: 'Informe o nome completo.' }, 400);

      // Create auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) return jsonResponse({ error: error.message }, 400);

      const newUserId = data.user.id;

      // Upsert profile
      const profilePayload: Record<string, unknown> = {
        id: newUserId,
        email,
        full_name: fullName,
        role,
        ...(phone ? { phone } : {}),
      };
      await supabase.from('profiles').upsert(profilePayload);

      // If client role, also create a Client record
      if (role === 'user') {
        await supabase.from('clients').upsert({
          user_id: newUserId,
          email,
          name: fullName,
          phone: phone ?? '',
        });
      }

      return jsonResponse({ user_id: newUserId, success: true });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (action === 'update') {
      const userId = String(body.user_id ?? '');
      if (!userId) return jsonResponse({ error: 'user_id obrigatório.' }, 400);

      // Update auth
      const authUpdate: Record<string, unknown> = { email_confirm: true };
      if (body.email)    authUpdate.email = String(body.email).trim().toLowerCase();
      if (body.password && String(body.password).length >= 6) authUpdate.password = String(body.password);
      if (body.full_name) authUpdate.user_metadata = { full_name: String(body.full_name).trim() };

      if (body.email || body.password || body.full_name) {
        const { error } = await supabase.auth.admin.updateUserById(userId, authUpdate);
        if (error) return jsonResponse({ error: error.message }, 400);
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (body.full_name !== undefined) profileUpdate.full_name = String(body.full_name).trim();
      if (body.email     !== undefined) profileUpdate.email     = String(body.email).trim().toLowerCase();
      if (body.role      !== undefined) profileUpdate.role      = String(body.role);
      if (body.phone     !== undefined) profileUpdate.phone     = body.phone;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from('profiles').update(profileUpdate).eq('id', userId);
      }

      return jsonResponse({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const userId = String(body.user_id ?? '');
      if (!userId) return jsonResponse({ error: 'user_id obrigatório.' }, 400);

      await supabase.from('profiles').delete().eq('id', userId);
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) return jsonResponse({ error: error.message }, 400);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400);

  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      500,
    );
  }
});

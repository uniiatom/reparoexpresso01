import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminOrService } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireAdminOrService(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const userId = body.user_id ? String(body.user_id) : null;
    const fullName = String(body.full_name ?? '').trim();

    if (!email) {
      return jsonResponse({ error: 'Informe o e-mail do prestador.' }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse({ error: 'A senha deve ter ao menos 6 caracteres.' }, 400);
    }

    const supabase = getServiceClient();

    if (userId) {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (error) return jsonResponse({ error: error.message }, 400);

      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName || data.user.user_metadata?.full_name || email.split('@')[0],
        role: 'provider',
      });

      return jsonResponse({ user_id: userId });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : {},
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    const newUserId = data.user.id;
    await supabase.from('profiles').upsert({
      id: newUserId,
      email,
      full_name: fullName || email.split('@')[0],
      role: 'provider',
    });

    return jsonResponse({ user_id: newUserId });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro ao configurar acesso do prestador.' },
      500,
    );
  }
});

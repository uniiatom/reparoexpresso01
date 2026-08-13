import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Resolve as credenciais do Supabase a partir do `.env` carregado via
/// `flutter_dotenv`. Usa as mesmas chaves do `.env` do app legado
/// (`legacy/.env.example`), então o mesmo arquivo pode ser reaproveitado
/// entre o app React e os apps Flutter durante a migração.
class SupabaseEnv {
  const SupabaseEnv({required this.url, required this.anonKey, required this.projectId});

  final String url;
  final String anonKey;
  final String projectId;

  bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;

  static SupabaseEnv resolve() {
    final env = dotenv.env;
    final projectId = (env['VITE_SUPABASE_PROJECT_ID'] ?? '').trim();
    final explicitUrl = (env['VITE_SUPABASE_URL'] ?? '').trim();
    final url = explicitUrl.isNotEmpty
        ? explicitUrl
        : (projectId.isNotEmpty ? 'https://$projectId.supabase.co' : '');
    final key = ((env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? '').trim().isNotEmpty
            ? env['VITE_SUPABASE_PUBLISHABLE_KEY']
            : env['VITE_SUPABASE_ANON_KEY'])
        ?.trim() ??
        '';

    return SupabaseEnv(url: url, anonKey: key, projectId: projectId);
  }
}

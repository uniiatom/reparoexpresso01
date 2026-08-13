import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/supabase_env.dart';

/// Bootstrap do Supabase, equivalente a `legacy/src/lib/supabase/client.js`.
///
/// Chame [ReparoSupabase.initialize] uma vez em `main()`, antes de `runApp`,
/// em cada um dos 3 apps. Espera um arquivo `.env` (mesmo formato do
/// `.env.example` do app legado) declarado como asset e carregado via
/// `flutter_dotenv`.
class ReparoSupabase {
  ReparoSupabase._();

  static late SupabaseEnv _env;

  /// Credenciais resolvidas do `.env`. Só válido após [initialize].
  static SupabaseEnv get env => _env;

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize({String envFileName = '.env'}) async {
    await dotenv.load(fileName: envFileName);
    _env = SupabaseEnv.resolve();

    if (!_env.isConfigured) {
      // ignore: avoid_print
      print(
        '[reparo_shared] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY '
        'não definidas no .env. Configure antes de rodar o app.',
      );
    }

    await Supabase.initialize(
      url: _env.url.isNotEmpty ? _env.url : 'https://configuracao-pendente.supabase.co',
      publishableKey: _env.anonKey.isNotEmpty ? _env.anonKey : 'anon-key-pendente',
    );
  }
}

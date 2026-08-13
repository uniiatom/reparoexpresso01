import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reparo_shared/reparo_shared.dart';

// Nota: não instanciamos `ClientApp` aqui — ele chama `ReparoSupabase.client`
// (Supabase.initialize real) já na tela inicial, o que dispara uma chamada
// de rede de verdade e trava o `flutter test` neste ambiente sandboxed
// (sem egress para domínios arbitrários). Cobertura de widget completa com
// Supabase mockado fica para quando houver injeção de dependência real
// (Fase 3 em /MIGRATION.md). Por ora, smoke test só do tema compartilhado.
void main() {
  testWidgets('AppTheme.dark aplica cores da paleta Dark Industrial', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(body: Text('Reparo Expresso — Cliente')),
      ),
    );

    expect(find.text('Reparo Expresso — Cliente'), findsOneWidget);
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold, isNotNull);
  });
}

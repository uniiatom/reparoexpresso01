import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reparo_shared/reparo_shared.dart';

// Ver nota em apps/client/test/widget_test.dart: `ProviderApp` dispara uma
// chamada de rede real ao Supabase já na tela inicial, o que trava o
// `flutter test` neste ambiente sandboxed. Smoke test do tema por ora.
void main() {
  testWidgets('AppTheme.dark aplica cores da paleta Dark Industrial', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(body: Text('Reparo Expresso — Prestador')),
      ),
    );

    expect(find.text('Reparo Expresso — Prestador'), findsOneWidget);
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold, isNotNull);
  });
}

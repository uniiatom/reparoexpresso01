import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_request_form_field.dart';

/// Formulário dinâmico por sub-serviço (`service_request_form_fields`/
/// `_answers`), religado no app cliente. `_files` (upload por campo) fica de
/// fora por enquanto — nenhum campo do tipo arquivo existe nos dados reais
/// ainda, e o app já tem upload de "fotos do problema" em geral.
class ServiceRequestFormRepository {
  ServiceRequestFormRepository(this._client);

  final SupabaseClient _client;

  /// Campos específicos do sub-serviço (`sub_service_id` igual ao
  /// informado). Campos globais (`sub_service_id` nulo) ficam de fora
  /// deliberadamente — já se sobrepõem aos campos fixos existentes
  /// (endereço, descrição do problema) e mostrar os dois juntos duplicaria
  /// a pergunta pro cliente.
  Future<List<ServiceRequestFormField>> listFields(String subServiceId) async {
    final data = await _client
        .from('service_request_form_fields')
        .select()
        .eq('sub_service_id', subServiceId)
        .eq('is_active', true)
        .order('sort_order');
    return (data as List).map((e) => ServiceRequestFormField.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Grava as respostas depois que a OS (`requestId`) já existe — a RLS de
  /// `service_request_form_answers` exige a OS criada antes (dono via
  /// `clients.user_id = auth.uid()`).
  Future<void> submitAnswers(String requestId, Map<String, String> answersByFieldId) async {
    if (answersByFieldId.isEmpty) return;
    final rows = answersByFieldId.entries
        .where((e) => e.value.trim().isNotEmpty)
        .map((e) => {
              'request_id': requestId,
              'field_id': e.key,
              'value_text': e.value.trim(),
            })
        .toList();
    if (rows.isEmpty) return;
    await _client.from('service_request_form_answers').insert(rows);
  }
}

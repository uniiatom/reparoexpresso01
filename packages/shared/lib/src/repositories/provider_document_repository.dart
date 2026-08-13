import 'package:supabase_flutter/supabase_flutter.dart';

/// Porta de `legacy/src/pages/ProviderCNPJRegistration.jsx` +
/// `ProviderDocumentReview.jsx` (lado de envio). Validação de CNPJ chama
/// uma API pública gratuita (mbrapi.com.br) já implementada na Edge
/// Function `validateCNPJ` — nenhuma credencial minha envolvida.
class ProviderDocumentRepository {
  ProviderDocumentRepository(this._client);

  final SupabaseClient _client;

  Future<Map<String, dynamic>> validateCnpj(String cnpj) async {
    final response = await _client.functions.invoke('validateCNPJ', body: {'cnpj': cnpj});
    return response.data as Map<String, dynamic>;
  }

  Future<void> saveCnpjData({
    required String cnpj,
    required Map<String, dynamic> companyData,
    String? cnpjFileUrl,
    String? addressProofUrl,
    String? legalRepIdUrl,
  }) async {
    await _client.functions.invoke('saveProviderCNPJData', body: {
      'cnpj': cnpj,
      'company_data': companyData,
      'documents': {
        'cnpj_file': cnpjFileUrl,
        'address_proof': addressProofUrl,
        'legal_rep_id': legalRepIdUrl,
      },
    });
  }

  /// Documento de identificação (RG/CNH etc.) — único slot de documento
  /// genérico com status/rejeição no schema real (ver /MIGRATION.md, seção
  /// 0.1; o antigo par CNH+CRLV como arquivos separados não tem coluna).
  Future<void> saveIdentityDocument(String providerId, String url) async {
    await _client.from('providers').update({
      'id_holding_document_url': url,
      'id_holding_document_status': 'enviado',
    }).eq('id', providerId);
  }

  /// Tipo de veículo pro CRLV (usado em reboque) — só o tipo é
  /// armazenado, sem upload de arquivo (sem coluna pra isso).
  Future<void> saveCrlvVehicleType(String providerId, String vehicleType) async {
    await _client.from('providers').update({'crlv_vehicle_type': vehicleType}).eq('id', providerId);
  }
}

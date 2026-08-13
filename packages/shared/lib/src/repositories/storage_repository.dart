import 'dart:math';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Porta simplificada de `legacy/src/lib/supabaseStorage.js` — upload pro
/// bucket `uploads` do Supabase Storage. Sem o registro em `media_library`
/// que o legado faz (biblioteca de mídia do admin) — ver Fase 3/4 em
/// /MIGRATION.md.
class StorageRepository {
  StorageRepository(this._client, {this.bucket = 'uploads'});

  final SupabaseClient _client;
  final String bucket;

  String _buildPath(String fileName) {
    final ext = fileName.contains('.') ? fileName.split('.').last : 'bin';
    var safeName = fileName.replaceAll(RegExp(r'[^\w.-]+'), '_');
    if (safeName.length > 80) safeName = safeName.substring(0, 80);
    if (safeName.isEmpty) safeName = 'file.$ext';

    final rand = Random().nextInt(1 << 32).toRadixString(36);
    return '${DateTime.now().millisecondsSinceEpoch}-$rand-$safeName';
  }

  Future<String> uploadBytes(Uint8List bytes, {required String fileName, String? contentType}) async {
    final path = _buildPath(fileName);

    await _client.storage.from(bucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );

    return _client.storage.from(bucket).getPublicUrl(path);
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:reparo_shared/reparo_shared.dart';

void main() {
  group('AppRole', () {
    test('resolve papéis canônicos', () {
      expect(AppRole.fromString('provider'), AppRole.provider);
      expect(AppRole.fromString('admin'), AppRole.admin);
    });

    test('normaliza role legado "prestador" para provider', () {
      expect(AppRole.fromString('prestador'), AppRole.provider);
    });

    test('retorna null para role vazio/desconhecido', () {
      expect(AppRole.fromString(null), isNull);
      expect(AppRole.fromString(''), isNull);
    });

    test('hasAnyRole', () {
      expect(hasAnyRole(AppRole.admin, [AppRole.admin, AppRole.attendant]), isTrue);
      expect(hasAnyRole(AppRole.user, [AppRole.admin, AppRole.attendant]), isFalse);
      expect(hasAnyRole(null, [AppRole.admin]), isFalse);
    });
  });

  group('ServiceRequestStatus', () {
    test('round-trip dbValue', () {
      for (final status in ServiceRequestStatus.values) {
        expect(ServiceRequestStatus.fromDbValue(status.dbValue), status);
      }
    });

    test('mapeia a_caminho corretamente', () {
      expect(ServiceRequestStatus.fromDbValue('a_caminho'), ServiceRequestStatus.aCaminho);
    });
  });

  group('ServiceRequest', () {
    test('fromJson/toJson preserva campos essenciais', () {
      final json = {
        'id': 'sr-1',
        'client_id': 'client-1',
        'profession_id': 'profession-1',
        'sub_service_id': 'sub-1',
        'professions': {'name': 'Eletricista'},
        'sub_services': {'name': 'Tomada/interruptor'},
        'status': 'aguardando',
        'created_at': '2026-08-11T10:00:00.000Z',
        'updated_at': '2026-08-11T10:00:00.000Z',
        'problem_photos': <String>[],
        'additional_points': <dynamic>[],
      };
      final sr = ServiceRequest.fromJson(json);
      expect(sr.id, 'sr-1');
      expect(sr.status, ServiceRequestStatus.aguardando);
      expect(sr.serviceLabel, 'Tomada/interruptor');
      expect(sr.toJson()['profession_id'], 'profession-1');
    });
  });

  group('OfferedService', () {
    test('fromJson resolve service_group', () {
      final json = {
        'id': 'os-1',
        'slug': 'eletrica',
        'name': 'Elétrica',
        'service_group': 'casa',
        'created_at': '2026-08-11T10:00:00.000Z',
        'updated_at': '2026-08-11T10:00:00.000Z',
      };
      final service = OfferedService.fromJson(json);
      expect(service.serviceGroup, ServiceGroup.casa);
    });
  });
}

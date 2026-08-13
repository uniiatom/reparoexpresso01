/// Linha de `public.clients` — perfil de cliente (distinto de `profiles`,
/// que só guarda auth/role). Ver `supabase/migrations/20260525120000_full_base44_migration.sql`.
class Client {
  const Client({
    required this.id,
    this.userId,
    required this.name,
    required this.phone,
    required this.createdAt,
    required this.updatedAt,
    this.cpf,
    this.birthDate,
    this.photoUrl,
    this.referralCode,
    this.addresses = const [],
    this.isBlacklisted = false,
    this.termsAcceptedAt,
  });

  final String id;
  final String? userId;
  final String name;
  final String phone;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? cpf;
  final DateTime? birthDate;
  final String? photoUrl;
  final String? referralCode;
  final List<dynamic> addresses;
  final bool isBlacklisted;
  final DateTime? termsAcceptedAt;

  factory Client.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? v) => v == null ? null : DateTime.parse(v as String);
    return Client(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      name: json['name'] as String,
      phone: json['phone'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      cpf: json['cpf']?.toString(),
      birthDate: parseDate(json['birth_date']),
      photoUrl: json['photo_url'] as String?,
      referralCode: json['referral_code'] as String?,
      addresses: (json['addresses'] as List?) ?? const [],
      isBlacklisted: json['is_blacklisted'] as bool? ?? false,
      termsAcceptedAt: parseDate(json['terms_accepted_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'phone': phone,
        'cpf': cpf,
        'birth_date': birthDate?.toIso8601String().split('T').first,
        'photo_url': photoUrl,
        'referral_code': referralCode,
        'addresses': addresses,
        'terms_accepted_at': termsAcceptedAt?.toIso8601String(),
      };
}

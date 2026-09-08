/// Profil du chauffeur, tel que renvoyé par `GET /auth/profile` ou inclus
/// dans la réponse de `POST /auth/otp/verify`.
class Driver {
  const Driver({
    required this.id,
    required this.fullName,
    required this.phone,
  });

  final String id;
  final String fullName;
  final String phone;

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id']?.toString() ?? '',
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      phone: (json['phone'] ?? json['identifier'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'phone': phone,
      };
}

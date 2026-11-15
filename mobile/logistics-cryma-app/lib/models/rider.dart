enum RiderStatus { available, onDelivery, offline }

class Rider {
  final String id;
  final String name;
  final String phone;
  final RiderStatus status;
  final int deliveriesToday;

  const Rider({
    required this.id,
    required this.name,
    required this.phone,
    required this.status,
    required this.deliveriesToday,
  });
}

final sampleRiders = [
  Rider(id: 'r1', name: 'Carlo Mendoza', phone: '09171234567', status: RiderStatus.onDelivery, deliveriesToday: 5),
  Rider(id: 'r2', name: 'Liza Gomez', phone: '09281234567', status: RiderStatus.available, deliveriesToday: 3),
  Rider(id: 'r3', name: 'Ben Torres', phone: '09391234567', status: RiderStatus.offline, deliveriesToday: 0),
];

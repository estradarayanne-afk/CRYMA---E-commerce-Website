import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/courier_parcel.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/courier_service.dart';
import '../../theme.dart';
import '../../widgets/courier_parcel_card.dart';
import '../../widgets/cryma_widgets.dart';

class RiderDashboardScreen extends StatefulWidget {
  const RiderDashboardScreen({super.key});

  @override
  State<RiderDashboardScreen> createState() => _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends State<RiderDashboardScreen> {
  List<CourierParcel> _active = [];
  int _completedCount = 0;
  bool _loading = true;
  String? _error;

  static const _navItems = [
    BottomNavigationBarItem(
      icon: Icon(Icons.home_outlined),
      activeIcon: Icon(Icons.home),
      label: 'Home',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.inventory_2_outlined),
      activeIcon: Icon(Icons.inventory_2),
      label: 'Parcels',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.person_outline),
      activeIcon: Icon(Icons.person),
      label: 'Account',
    ),
  ];

  static const _navRoutes = [
    '/rider',
    '/rider/parcels',
    '/rider/account',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        CourierService.instance.getActiveParcels(),
        CourierService.instance.getHistory(),
      ]);
      if (!mounted) return;
      setState(() {
        _active = results[0];
        _completedCount = results[1]
            .where((parcel) =>
                parcel.status == 'DELIVERED' ||
                parcel.status == 'COMPLETED' ||
                parcel.status == 'RECEIVED')
            .length;
        _loading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = context.watch<AuthProvider>().userName;
    return Scaffold(
      appBar: AppBar(
        title: const CrymaLogo(size: 19, showSubtitle: false),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _LoadError(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    children: [
                      Text(
                        'Hello, ${name.isNotEmpty ? name.split(' ').first : 'Rider'}',
                        style: CrymaText.headingLarge,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Your assigned courier work, synced with CRYMA.',
                        style: CrymaText.bodyMedium,
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: _SummaryCard(
                              label: 'Active assignments',
                              value: '${_active.length}',
                              icon: Icons.local_shipping_outlined,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _SummaryCard(
                              label: 'Completed in history',
                              value: '$_completedCount',
                              icon: Icons.check_circle_outline,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SectionHeader(
                        'Assigned work',
                        trailing: TextButton(
                          onPressed: () => context.go('/rider/parcels'),
                          child: const Text('See all'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (_active.isEmpty)
                        const EmptyState(
                          icon: Icons.inventory_2_outlined,
                          title: 'No active assignments',
                          subtitle:
                              'New pickups and deliveries assigned to you will appear here.',
                        )
                      else
                        ..._active.take(4).map(
                              (parcel) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: CourierParcelCard(
                                  parcel: parcel,
                                  onTap: () => context.go(
                                    '/rider/parcels/${parcel.routeType}/${parcel.id}',
                                  ),
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 0,
        items: _navItems,
        routes: _navRoutes,
        onNavigate: context.go,
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CrymaColors.palePink,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: CrymaColors.primary),
            const SizedBox(height: 12),
            Text(value, style: CrymaText.headingLarge),
            Text(label, style: CrymaText.caption),
          ],
        ),
      );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined, size: 40),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ),
        ),
      );
}

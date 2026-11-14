import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/courier_parcel.dart';
import '../../services/api_client.dart';
import '../../services/courier_service.dart';
import '../../widgets/courier_parcel_card.dart';
import '../../widgets/cryma_widgets.dart';

class RiderParcelsScreen extends StatefulWidget {
  const RiderParcelsScreen({super.key});

  @override
  State<RiderParcelsScreen> createState() => _RiderParcelsScreenState();
}

class _RiderParcelsScreenState extends State<RiderParcelsScreen> {
  List<CourierParcel> _active = [];
  List<CourierParcel> _history = [];
  bool _showHistory = false;
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
        _history = results[1];
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
    final parcels = _showHistory ? _history : _active;
    return Scaffold(
      appBar: AppBar(title: const Text('My Parcels')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _load,
                          child: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment(value: false, label: Text('Active')),
                          ButtonSegment(value: true, label: Text('History')),
                        ],
                        selected: {_showHistory},
                        onSelectionChanged: (selection) =>
                            setState(() => _showHistory = selection.first),
                      ),
                    ),
                    Expanded(
                      child: parcels.isEmpty
                          ? EmptyState(
                              icon: Icons.inventory_2_outlined,
                              title: _showHistory
                                  ? 'No parcel history'
                                  : 'No active assignments',
                              subtitle: _showHistory
                                  ? 'Completed and closed work will appear here.'
                                  : 'Pickups and deliveries assigned to you will appear here.',
                            )
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.separated(
                                padding:
                                    const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                itemCount: parcels.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 8),
                                itemBuilder: (_, index) {
                                  final parcel = parcels[index];
                                  return CourierParcelCard(
                                    parcel: parcel,
                                    onTap: () => context.go(
                                      '/rider/parcels/${parcel.routeType}/${parcel.id}',
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 1,
        items: _navItems,
        routes: _navRoutes,
        onNavigate: context.go,
      ),
    );
  }
}

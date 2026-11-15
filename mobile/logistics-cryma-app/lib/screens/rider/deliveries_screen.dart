import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/order_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderDeliveriesScreen extends StatefulWidget {
  const RiderDeliveriesScreen({super.key});

  @override
  State<RiderDeliveriesScreen> createState() => _RiderDeliveriesScreenState();
}

class _RiderDeliveriesScreenState extends State<RiderDeliveriesScreen> {
  static const _navItems = [
    BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: 'Orders'),
    BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Messages'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
  ];
  static const _navRoutes = ['/rider', '/rider/deliveries', '/rider/messages', '/rider/profile'];

  List<OrderModel> _orders = [];
  OrderStatus? _filter;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final orders = await OrderService.instance.getOrdersForRider(riderId);
    if (mounted) setState(() { _orders = orders; _loading = false; });
  }

  List<OrderModel> get _filtered =>
      _filter == null ? _orders : _orders.where((o) => o.status == _filter).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      _Chip(label: 'All', selected: _filter == null, onTap: () => setState(() => _filter = null)),
                      const SizedBox(width: 8),
                      for (final s in OrderStatus.values) ...[
                        _Chip(label: s.label, selected: _filter == s, onTap: () => setState(() => _filter = s)),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: _filtered.isEmpty
                      ? const EmptyState(
                          icon: Icons.inventory_2_outlined,
                          title: 'No orders found',
                          subtitle: 'Try a different filter.',
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                            itemCount: _filtered.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) {
                              final o = _filtered[i];
                              return OrderCard(
                                order: o,
                                onTap: () => context.go('/rider/deliveries/${o.orderId}'),
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

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _Chip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? CrymaColors.primary : CrymaColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? CrymaColors.primary : CrymaColors.divider),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : CrymaColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

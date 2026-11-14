import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/order_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderHomeScreen extends StatefulWidget {
  const RiderHomeScreen({super.key});

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  static const _navItems = [
    BottomNavigationBarItem(
        icon: Icon(Icons.home_outlined),
        activeIcon: Icon(Icons.home),
        label: 'Home'),
    BottomNavigationBarItem(
        icon: Icon(Icons.inventory_2_outlined),
        activeIcon: Icon(Icons.inventory_2),
        label: 'Orders'),
    BottomNavigationBarItem(
        icon: Icon(Icons.chat_bubble_outline),
        activeIcon: Icon(Icons.chat_bubble),
        label: 'Messages'),
    BottomNavigationBarItem(
        icon: Icon(Icons.person_outline),
        activeIcon: Icon(Icons.person),
        label: 'Profile'),
  ];
  static const _navRoutes = [
    '/rider',
    '/rider/deliveries',
    '/rider/messages',
    '/rider/profile'
  ];

  List<OrderModel> _orders = [];
  List<OrderModel> _delivered = [];
  bool _loading = true;
  bool _isOnline = false;
  bool _togglingOnline = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final results = await Future.wait([
      OrderService.instance.getOrdersForRider(riderId),
      OrderService.instance.getDeliveredOrdersForRider(riderId),
    ]);
    final online = await AuthService.instance.getRiderOnlineStatus(riderId);
    if (mounted) {
      setState(() {
        _orders = results[0];
        _delivered = results[1];
        _isOnline = online;
        _loading = false;
      });
    }
  }

  Future<void> _toggleOnline() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    setState(() => _togglingOnline = true);
    final err = await AuthService.instance.setOnlineStatus(riderId, !_isOnline);
    if (err != null && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(err)));
    } else {
      setState(() => _isOnline = !_isOnline);
    }
    setState(() => _togglingOnline = false);
  }

  void _showReceipt({
    required String title,
    required List<OrderModel> orders,
    required Color color,
    required Color surface,
    required IconData icon,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: orders.isEmpty ? 0.35 : 0.6,
        maxChildSize: 0.92,
        builder: (_, scrollCtrl) => Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Column(
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                          color: CrymaColors.divider,
                          borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                            color: surface,
                            borderRadius: BorderRadius.circular(10)),
                        child: Icon(icon, color: color, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: CrymaText.headingMedium),
                          Text(
                              '${orders.length} order${orders.length == 1 ? '' : 's'}',
                              style: CrymaText.bodyMedium),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                ],
              ),
            ),
            // Order list
            Expanded(
              child: orders.isEmpty
                  ? const EmptyState(
                      icon: Icons.inbox_outlined,
                      title: 'No orders here',
                      subtitle: 'Nothing to show in this category.',
                    )
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                      itemCount: orders.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 1),
                      itemBuilder: (_, i) => _ReceiptRow(
                        order: orders[i],
                        accentColor: color,
                        onTap: () {
                          Navigator.pop(ctx);
                          context.go('/rider/deliveries/${orders[i].orderId}');
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = context.watch<AuthProvider>().userName;
    final active = _orders.where((o) => o.status.isActiveDelivery).toList();
    final available =
        _orders.where((o) => o.status == OrderStatus.forPickUp).toList();

    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Hello, ${name.isNotEmpty ? name.split(' ').first : 'Rider'} 👋',
                                    style: CrymaText.headingLarge,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  const Text("Here's your day at a glance.",
                                      style: CrymaText.bodyMedium),
                                ],
                              ),
                            ),
                            Row(children: [
                              _togglingOnline
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2))
                                  : GestureDetector(
                                      onTap: _toggleOnline,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: _isOnline
                                              ? CrymaColors.statusDelivered
                                              : CrymaColors.textHint,
                                          borderRadius:
                                              BorderRadius.circular(20),
                                        ),
                                        child: Row(children: [
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                                color: Colors.white,
                                                shape: BoxShape.circle),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            _isOnline ? 'Online' : 'Offline',
                                            style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700),
                                          ),
                                        ]),
                                      ),
                                    ),
                              const SizedBox(width: 8),
                              const CrymaLogo(size: 18),
                            ]),
                          ],
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                        child: LayoutBuilder(builder: (context, constraints) {
                          final scale =
                              MediaQuery.textScalerOf(context).scale(1);
                          final columns = constraints.maxWidth >= 600
                              ? 3
                              : scale > 1.25
                                  ? 1
                                  : 2;
                          final width =
                              (constraints.maxWidth - (columns - 1) * 10) /
                                  columns;
                          return Wrap(spacing: 10, runSpacing: 10, children: [
                            SizedBox(
                                width: width,
                                child: _TappableStatCard(
                                  label: 'For Pick Up',
                                  value: '${available.length}',
                                  color: CrymaColors.statusPending,
                                  surfaceColor:
                                      CrymaColors.statusPendingSurface,
                                  onTap: () => _showReceipt(
                                    title: 'For Pick Up',
                                    orders: available,
                                    color: CrymaColors.statusPending,
                                    surface: CrymaColors.statusPendingSurface,
                                    icon: Icons.schedule_outlined,
                                  ),
                                )),
                            SizedBox(
                                width: width,
                                child: _TappableStatCard(
                                  label: 'Active',
                                  value: '${active.length}',
                                  color: CrymaColors.primary,
                                  surfaceColor: CrymaColors.palePink,
                                  onTap: () => _showReceipt(
                                    title: 'Active Orders',
                                    orders: active,
                                    color: CrymaColors.primary,
                                    surface: CrymaColors.palePink,
                                    icon: Icons.local_shipping_outlined,
                                  ),
                                )),
                            SizedBox(
                                width: width,
                                child: _TappableStatCard(
                                  label: 'Delivered',
                                  value: '${_delivered.length}',
                                  color: CrymaColors.statusDelivered,
                                  surfaceColor:
                                      CrymaColors.statusDeliveredSurface,
                                  onTap: () => _showReceipt(
                                    title: 'Delivered',
                                    orders: _delivered,
                                    color: CrymaColors.statusDelivered,
                                    surface: CrymaColors.statusDeliveredSurface,
                                    icon: Icons.check_circle_outline,
                                  ),
                                )),
                          ]);
                        }),
                      ),
                    ),
                    if (active.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SectionHeader('Active Order'),
                              const SizedBox(height: 12),
                              _ActiveOrderCard(order: active.first),
                            ],
                          ),
                        ),
                      ),
                    if (available.isNotEmpty) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                          child: SectionHeader(
                            'For Pick Up',
                            trailing: TextButton(
                              onPressed: () => context.go('/rider/deliveries'),
                              style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap),
                              child: const Text('See all'),
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                        sliver: SliverList.separated(
                          itemCount:
                              available.length > 3 ? 3 : available.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => OrderCard(
                            order: available[i],
                            onTap: () => context.go(
                                '/rider/deliveries/${available[i].orderId}'),
                          ),
                        ),
                      ),
                    ] else if (active.isEmpty)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(20, 24, 20, 32),
                          child: EmptyState(
                            icon: Icons.check_circle_outline,
                            title: 'All caught up!',
                            subtitle: 'No pending orders right now.',
                          ),
                        ),
                      ),
                  ],
                ),
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

// ── Tappable Stat Card ────────────────────────────────────────────────────────
class _TappableStatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final Color surfaceColor;
  final VoidCallback onTap;

  const _TappableStatCard({
    required this.label,
    required this.value,
    required this.color,
    required this.surfaceColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: surfaceColor,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: TextStyle(
                      fontSize: 26, fontWeight: FontWeight.w700, color: color)),
              const SizedBox(height: 2),
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      color: color.withValues(alpha: 0.8),
                      fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.chevron_right,
                      size: 14, color: color.withValues(alpha: 0.5)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Receipt Row ───────────────────────────────────────────────────────────────
class _ReceiptRow extends StatelessWidget {
  final OrderModel order;
  final Color accentColor;
  final VoidCallback onTap;

  const _ReceiptRow(
      {required this.order, required this.accentColor, required this.onTap});

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 44,
              decoration: BoxDecoration(
                  color: accentColor, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(order.orderId,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: CrymaColors.textPrimary,
                          fontFamily: 'monospace')),
                  const SizedBox(height: 2),
                  Text(order.itemName,
                      style: CrymaText.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_formatDate(order.updatedAt), style: CrymaText.caption),
                const SizedBox(height: 2),
                const Icon(Icons.chevron_right,
                    size: 16, color: CrymaColors.textHint),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Active Order Card ─────────────────────────────────────────────────────────
class _ActiveOrderCard extends StatelessWidget {
  final OrderModel order;
  const _ActiveOrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: CrymaColors.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(order.orderId,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15)),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20)),
                child: Text(order.status.label,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(children: [
            const Icon(Icons.inventory_2_outlined,
                size: 14, color: Colors.white70),
            const SizedBox(width: 6),
            Expanded(
                child: Text(order.itemName,
                    style: const TextStyle(color: Colors.white, fontSize: 13))),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            const Icon(Icons.location_on_outlined,
                size: 14, color: Colors.white70),
            const SizedBox(width: 6),
            Expanded(
                child: Text(order.destination,
                    style:
                        const TextStyle(color: Colors.white70, fontSize: 13))),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => context.go('/rider/deliveries/${order.orderId}'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: CrymaColors.primary,
                minimumSize: const Size(double.infinity, 44),
              ),
              child: const Text('View Order',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}

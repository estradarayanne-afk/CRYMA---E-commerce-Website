import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/order_service.dart';
import '../../services/report_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _totalRiders = 0;
  int _ridersWithOrders = 0;
  int _activeDeliveries = 0;
  int _ridersWithWarnings = 0;
  int _pendingRequests = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final results = await Future.wait([
      AuthService.instance.getTotalRiders(),
      OrderService.instance.countRidersTakingOrders(),
      OrderService.instance.countActiveDeliveries(),
      ReportService.instance.countRidersWithActiveReports(),
      AuthService.instance.getPendingRiders().then((l) => l.length),
      AuthService.instance
          .getRidersWithPendingLicenseUpdate()
          .then((l) => l.length),
    ]);
    if (mounted) {
      setState(() {
        _totalRiders = results[0];
        _ridersWithOrders = results[1];
        _activeDeliveries = results[2];
        _ridersWithWarnings = results[3];
        _pendingRequests = results[4] + results[5];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = context.watch<AuthProvider>().userName;

    return Scaffold(
      backgroundColor: CrymaColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                  color: CrymaColors.primary,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const CrymaLogo(size: 22),
                      const SizedBox(height: 16),
                      Text('Hello, $name',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w700)),
                      const Text('Super User Dashboard',
                          style:
                              TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              if (_loading)
                const SliverToBoxAdapter(
                    child: Padding(
                        padding: EdgeInsets.all(40),
                        child: Center(child: CircularProgressIndicator())))
              else ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Overview', style: CrymaText.headingSmall),
                        const SizedBox(height: 12),
                        _OverviewGrid(
                          tiles: [
                            _StatTile(
                                label: 'Total Riders',
                                value: '$_totalRiders',
                                icon: Icons.people_outline,
                                color: CrymaColors.primary),
                            _StatTile(
                                label: 'Taking Orders',
                                value: '$_ridersWithOrders',
                                icon: Icons.delivery_dining_outlined,
                                color: CrymaColors.statusInTransit),
                            _StatTile(
                                label: 'Being Delivered',
                                value: '$_activeDeliveries',
                                icon: Icons.local_shipping_outlined,
                                color: CrymaColors.statusOutForDelivery),
                            _StatTile(
                                label: 'With Warnings',
                                value: '$_ridersWithWarnings',
                                icon: Icons.warning_amber_outlined,
                                color: CrymaColors.warning),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                    child:
                        const Text('Management', style: CrymaText.headingSmall),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  sliver: SliverToBoxAdapter(
                    child: LayoutBuilder(builder: (context, constraints) {
                      final w = constraints.maxWidth;
                      final columns = w >= 560 ? 3 : 2;
                      final cardWidth = (w - (columns - 1) * 12) / columns;
                      return Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.add_box_outlined,
                              label: 'Create Order',
                              onTap: () => context.go('/admin/orders/create'),
                              highlight: true),
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.people_outline,
                              label: 'All Riders',
                              onTap: () => context.go('/admin/riders')),
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.how_to_reg_outlined,
                              label: 'Rider Requests',
                              onTap: () => context.go('/admin/rider-requests'),
                              badgeCount: _pendingRequests),
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.inventory_2_outlined,
                              label: 'Orders / Items',
                              onTap: () => context.go('/admin/orders')),
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.bar_chart_outlined,
                              label: 'Data Sheet',
                              onTap: () => context.go('/admin/datasheet')),
                          _NavCard(
                              width: cardWidth,
                              icon: Icons.manage_accounts_outlined,
                              label: 'Accounts',
                              onTap: () => context.go('/admin/account-management')),
                          _NavCard(
                            width: cardWidth,
                            icon: Icons.logout,
                            label: 'Logout',
                            onTap: () async {
                              await context.read<AuthProvider>().logout();
                              if (context.mounted) context.go('/welcome');
                            },
                            isLogout: true,
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _OverviewGrid extends StatelessWidget {
  final List<_StatTile> tiles;
  const _OverviewGrid({required this.tiles});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(1);
        final columns = constraints.maxWidth >= 700
            ? 4
            : scale > 1.4
                ? 1
                : 2;
        final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final tile in tiles) SizedBox(width: width, child: tile)
          ],
        );
      },
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatTile(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: CrymaColors.divider),
      ),
      child: LayoutBuilder(builder: (context, constraints) {
        final compact = constraints.maxWidth < 155 ||
            MediaQuery.textScalerOf(context).scale(1) > 1.25;
        return compact
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: color, size: 22),
                  const SizedBox(height: 6),
                  Text(value,
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: color)),
                  Text(label,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, color: CrymaColors.textSecondary)),
                ],
              )
            : Row(children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(value,
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: color)),
                      Text(label,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 11,
                              color: CrymaColors.textSecondary)),
                    ],
                  ),
                ),
              ]);
      }),
    );
  }
}

class _NavCard extends StatelessWidget {
  final double width;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool highlight;
  final bool isLogout;
  final int badgeCount;
  const _NavCard(
      {required this.width,
      required this.icon,
      required this.label,
      required this.onTap,
      this.highlight = false,
      this.isLogout = false,
      this.badgeCount = 0});

  @override
  Widget build(BuildContext context) {
    final bg = isLogout
        ? CrymaColors.errorSurface
        : (highlight ? CrymaColors.palePink : CrymaColors.surface);
    final iconColor = isLogout ? CrymaColors.error : CrymaColors.primary;
    final textColor = isLogout ? CrymaColors.error : CrymaColors.textPrimary;

    return SizedBox(
      width: width,
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: CrymaColors.divider)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(icon, color: iconColor, size: 26),
                    if (badgeCount > 0)
                      Positioned(
                        top: -4,
                        right: -10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                              color: CrymaColors.error,
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('$badgeCount',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: textColor)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

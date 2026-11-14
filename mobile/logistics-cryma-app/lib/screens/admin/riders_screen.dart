import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../database/app_constants.dart';
import '../../services/auth_service.dart';
import '../../services/report_service.dart';
import '../../services/order_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

enum _SortOption {
  nameAZ, nameZA, riderId, newest, oldest, mostReports, leastReports, takingOrders
}

class AdminRidersScreen extends StatefulWidget {
  const AdminRidersScreen({super.key});

  @override
  State<AdminRidersScreen> createState() => _AdminRidersScreenState();
}

class _AdminRidersScreenState extends State<AdminRidersScreen> {
  List<UserModel> _riders = [];
  Map<int, int> _reportCounts = {};
  Map<int, bool> _takingOrder = {};
  bool _loading = true;
  String _search = '';
  _SortOption _sort = _SortOption.newest;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final riders = await AuthService.instance.getAllRiders();
    final Map<int, int> counts = {};
    final Map<int, bool> taking = {};
    for (final r in riders) {
      counts[r.id] = await ReportService.instance.countActiveReportsForRider(r.id);
      final orders = await OrderService.instance.getOrdersForRider(r.id);
      taking[r.id] = orders.any((o) => o.status.isActiveDelivery);
    }
    if (mounted) {
      setState(() {
        _riders = riders;
        _reportCounts = counts;
        _takingOrder = taking;
        _loading = false;
      });
    }
  }

  List<UserModel> get _filtered {
    var list = _riders.where((r) {
      if (_search.isEmpty) return true;
      final q = _search.toLowerCase();
      return r.fullName.toLowerCase().contains(q) ||
          r.email.toLowerCase().contains(q) ||
          (r.riderId?.toLowerCase().contains(q) ?? false);
    }).toList();

    list.sort((a, b) => switch (_sort) {
          _SortOption.nameAZ => a.fullName.compareTo(b.fullName),
          _SortOption.nameZA => b.fullName.compareTo(a.fullName),
          _SortOption.riderId => (a.riderId ?? '').compareTo(b.riderId ?? ''),
          _SortOption.newest => b.createdAt.compareTo(a.createdAt),
          _SortOption.oldest => a.createdAt.compareTo(b.createdAt),
          _SortOption.mostReports => (_reportCounts[b.id] ?? 0).compareTo(_reportCounts[a.id] ?? 0),
          _SortOption.leastReports => (_reportCounts[a.id] ?? 0).compareTo(_reportCounts[b.id] ?? 0),
          _SortOption.takingOrders => (_takingOrder[b.id] == true ? 1 : 0).compareTo(_takingOrder[a.id] == true ? 1 : 0),
        });
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Riders'),
        leading: BackButton(onPressed: () => context.go('/admin')),
        actions: [
          PopupMenuButton<_SortOption>(
            icon: const Icon(Icons.sort),
            onSelected: (v) => setState(() => _sort = v),
            itemBuilder: (_) => const [
              PopupMenuItem(value: _SortOption.nameAZ, child: Text('Name A → Z')),
              PopupMenuItem(value: _SortOption.nameZA, child: Text('Name Z → A')),
              PopupMenuItem(value: _SortOption.riderId, child: Text('Rider ID')),
              PopupMenuItem(value: _SortOption.newest, child: Text('Newest Registration')),
              PopupMenuItem(value: _SortOption.oldest, child: Text('Oldest Registration')),
              PopupMenuItem(value: _SortOption.mostReports, child: Text('Most Reports')),
              PopupMenuItem(value: _SortOption.leastReports, child: Text('Least Reports')),
              PopupMenuItem(value: _SortOption.takingOrders, child: Text('Currently Taking Orders')),
            ],
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search by name, email, or Rider ID...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(icon: const Icon(Icons.clear), onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); })
                          : null,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                Expanded(
                  child: _filtered.isEmpty
                      ? const EmptyState(icon: Icons.people_outline, title: 'No riders found.', subtitle: 'Try a different search term.')
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                            itemCount: _filtered.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) {
                              final r = _filtered[i];
                              final reports = _reportCounts[r.id] ?? 0;
                              final taking = _takingOrder[r.id] ?? false;
                              return _RiderCard(
                                rider: r,
                                activeReports: reports,
                                isTakingOrder: taking,
                                onTap: () => context.go('/admin/riders/${r.id}'),
                                onViewCitations: () => context.go('/admin/riders/${r.id}/citations'),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

class _RiderCard extends StatelessWidget {
  final UserModel rider;
  final int activeReports;
  final bool isTakingOrder;
  final VoidCallback onTap;
  final VoidCallback onViewCitations;
  const _RiderCard({required this.rider, required this.activeReports, required this.isTakingOrder, required this.onTap, required this.onViewCitations});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: activeReports > 0 ? CrymaColors.primary.withValues(alpha: 0.3) : CrymaColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: CrymaColors.palePink,
                child: Text(rider.fullName[0].toUpperCase(), style: const TextStyle(color: CrymaColors.primary, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(rider.fullName, style: CrymaText.headingSmall),
                    Text(rider.riderId ?? '', style: const TextStyle(fontSize: 12, color: CrymaColors.textSecondary)),
                  ],
                ),
              ),
              if (isTakingOrder)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: CrymaColors.statusInTransitSurface, borderRadius: BorderRadius.circular(20)),
                  child: const Text('On Order', style: TextStyle(fontSize: 11, color: CrymaColors.statusInTransit, fontWeight: FontWeight.w600)),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(rider.email, style: CrymaText.bodyMedium),
          if (rider.vehicleType != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.two_wheeler_outlined, size: 14, color: CrymaColors.textSecondary),
              const SizedBox(width: 4),
              Text(rider.vehicleType!, style: CrymaText.bodyMedium),
            ]),
          ],
          if (activeReports > 0) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.warning_amber_rounded, size: 16, color: CrymaColors.warning),
              const SizedBox(width: 4),
              Text('$activeReports Active ${activeReports == 1 ? 'Report' : 'Reports'}',
                  style: const TextStyle(fontSize: 13, color: CrymaColors.warning, fontWeight: FontWeight.w600)),
            ]),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onViewCitations,
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 12)),
                  child: const Text('View Citations'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: onTap,
                  style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 12)),
                  child: const Text('Manage'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

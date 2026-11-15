import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/order_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  List<OrderModel> _history = [];
  Map<String, double> _earnings = {'pickup': 0, 'delivery': 0};
  double _codBalance = 0;
  List<OrderModel> _codOrders = [];
  List<Map<String, dynamic>> _remittances = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final results = await Future.wait([
      OrderService.instance.getHistoryForRider(riderId),
      OrderService.instance.getEarningsForRider(riderId),
      OrderService.instance.getCodBalanceForRider(riderId),
      OrderService.instance.getCodOrdersForRider(riderId),
      OrderService.instance.getRemittancesForRider(riderId),
    ]);
    if (mounted) {
      setState(() {
        _history = results[0] as List<OrderModel>;
        _earnings = results[1] as Map<String, double>;
        _codBalance = results[2] as double;
        _codOrders = results[3] as List<OrderModel>;
        _remittances = results[4] as List<Map<String, dynamic>>;
        _loading = false;
      });
    }
  }

  Future<void> _submitRemittance() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final ctrl = TextEditingController(
        text: _codBalance > 0 ? _codBalance.toStringAsFixed(2) : '');
    final formKey = GlobalKey<FormState>();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 32),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(
                      color: CrymaColors.divider,
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Submit COD Remittance',
                  style: CrymaText.headingMedium),
              const SizedBox(height: 4),
              Text('Balance to remit: ₱${_codBalance.toStringAsFixed(2)}',
                  style: CrymaText.bodyMedium),
              const SizedBox(height: 14),
              TextFormField(
                controller: ctrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                ],
                decoration: const InputDecoration(
                  labelText: 'Amount to Remit (₱)',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required.';
                  final val = double.tryParse(v.trim());
                  if (val == null || val <= 0) return 'Enter a valid amount.';
                  if (val > _codBalance + 0.001) {
                    return 'Exceeds your balance of ₱${_codBalance.toStringAsFixed(2)}.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final amount = double.parse(ctrl.text.trim());
                  Navigator.pop(ctx);
                  final err = await OrderService.instance
                      .submitRemittance(riderId, amount);
                  if (!mounted) return;
                  if (err != null) {
                    ScaffoldMessenger.of(context)
                        .showSnackBar(SnackBar(content: Text(err)));
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('Remittance submitted. Awaiting confirmation.')));
                    _load();
                  }
                },
                child: const Text('Submit Remittance'),
              ),
            ],
          ),
        ),
      ),
    );
    ctrl.dispose();
  }

  String _fmtDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      const m = [
        'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'
      ];
      return '${m[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalEarnings = (_earnings['pickup'] ?? 0) + (_earnings['delivery'] ?? 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings & COD'),
        leading: BackButton(onPressed: () => context.go('/rider/profile')),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'History'),
            Tab(text: 'Earnings'),
            Tab(text: 'COD'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                // ── History tab (RID-EARN-001) ──────────────────────────────
                RefreshIndicator(
                  onRefresh: _load,
                  child: _history.isEmpty
                      ? const EmptyState(
                          icon: Icons.history_outlined,
                          title: 'No history yet',
                          subtitle: 'Completed jobs will appear here.')
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _history.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final o = _history[i];
                            final pay = o.pickupPay + o.deliveryPay;
                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: CrymaColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: CrymaColors.divider),
                              ),
                              child: Row(children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(o.orderId,
                                          style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              fontFamily: 'monospace')),
                                      const SizedBox(height: 2),
                                      Text(o.itemName,
                                          style: CrymaText.bodyMedium,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis),
                                      const SizedBox(height: 2),
                                      Text(_fmtDate(o.updatedAt),
                                          style: CrymaText.caption),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    StatusBadge(status: o.status),
                                    const SizedBox(height: 4),
                                    Text(
                                      pay > 0
                                          ? '₱${pay.toStringAsFixed(2)}'
                                          : '—',
                                      style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: pay > 0
                                              ? CrymaColors.statusDelivered
                                              : CrymaColors.textHint),
                                    ),
                                  ],
                                ),
                              ]),
                            );
                          },
                        ),
                ),

                // ── Earnings tab (RID-EARN-002) ─────────────────────────────
                SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: CrymaColors.primary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(children: [
                          const Text('Total Earnings',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 13)),
                          const SizedBox(height: 4),
                          Text(
                            '₱${totalEarnings.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w800),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      _EarnRow(
                          label: 'Pickup Pay',
                          value: _earnings['pickup'] ?? 0,
                          icon: Icons.inventory_outlined,
                          note: '₱30.00 per pickup'),
                      const SizedBox(height: 10),
                      _EarnRow(
                          label: 'Delivery Pay',
                          value: _earnings['delivery'] ?? 0,
                          icon: Icons.delivery_dining_outlined,
                          note: '₱50.00 per delivery'),
                    ],
                  ),
                ),

                // ── COD tab (RID-EARN-003 to RID-EARN-006) ─────────────────
                RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Balance card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _codBalance > 0
                              ? CrymaColors.warningSurface
                              : CrymaColors.statusDeliveredSurface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: _codBalance > 0
                                  ? CrymaColors.warning
                                  : CrymaColors.statusDelivered,
                              width: 1.5),
                        ),
                        child: Row(children: [
                          Icon(
                            _codBalance > 0
                                ? Icons.payments_outlined
                                : Icons.check_circle_outline,
                            color: _codBalance > 0
                                ? CrymaColors.warning
                                : CrymaColors.statusDelivered,
                            size: 28,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('COD Balance to Remit',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: CrymaColors.textSecondary)),
                                Text(
                                  '₱${_codBalance.toStringAsFixed(2)}',
                                  style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: _codBalance > 0
                                          ? CrymaColors.warning
                                          : CrymaColors.statusDelivered),
                                ),
                              ],
                            ),
                          ),
                          if (_codBalance > 0)
                            FilledButton(
                              onPressed: _submitRemittance,
                              style: FilledButton.styleFrom(
                                  backgroundColor: CrymaColors.warning),
                              child: const Text('Remit'),
                            ),
                        ]),
                      ),
                      const SizedBox(height: 16),

                      // COD orders
                      if (_codOrders.isNotEmpty) ...[
                        const SectionHeader('Collected COD Orders'),
                        const SizedBox(height: 8),
                        ..._codOrders.map((o) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: CrymaColors.surface,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                      color: CrymaColors.divider),
                                ),
                                child: Row(children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(o.orderId,
                                            style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                fontFamily: 'monospace')),
                                        Text(o.recipient,
                                            style: CrymaText.caption),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '₱${o.codAmount.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: CrymaColors.textPrimary),
                                  ),
                                ]),
                              ),
                            )),
                        const SizedBox(height: 16),
                      ],

                      // Remittance history
                      if (_remittances.isNotEmpty) ...[
                        const SectionHeader('Remittance History'),
                        const SizedBox(height: 8),
                        ..._remittances.map((r) {
                          final isPending = r['status'] == 'pending';
                          final shortfall =
                              (r['shortfall'] as num?)?.toDouble() ?? 0;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isPending
                                    ? CrymaColors.statusPendingSurface
                                    : CrymaColors.statusDeliveredSurface,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(children: [
                                Icon(
                                  isPending
                                      ? Icons.hourglass_top_outlined
                                      : Icons.check_circle_outline,
                                  size: 18,
                                  color: isPending
                                      ? CrymaColors.statusPending
                                      : CrymaColors.statusDelivered,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isPending ? 'Pending' : 'Confirmed',
                                        style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: isPending
                                                ? CrymaColors.statusPending
                                                : CrymaColors
                                                    .statusDelivered),
                                      ),
                                      Text(
                                          _fmtDate(
                                              r['created_at'] as String),
                                          style: CrymaText.caption),
                                      if (shortfall > 0)
                                        Text(
                                          'Shortfall: ₱${shortfall.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                              fontSize: 11,
                                              color: CrymaColors.error),
                                        ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '₱${(r['amount'] as num).toStringAsFixed(2)}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700),
                                ),
                              ]),
                            ),
                          );
                        }),
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _EarnRow extends StatelessWidget {
  final String label;
  final double value;
  final IconData icon;
  final String note;
  const _EarnRow(
      {required this.label,
      required this.value,
      required this.icon,
      required this.note});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: CrymaColors.divider),
      ),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              color: CrymaColors.palePink,
              borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: CrymaColors.primary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600)),
            Text(note, style: CrymaText.caption),
          ]),
        ),
        Text(
          '₱${value.toStringAsFixed(2)}',
          style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: CrymaColors.primary),
        ),
      ]),
    );
  }
}

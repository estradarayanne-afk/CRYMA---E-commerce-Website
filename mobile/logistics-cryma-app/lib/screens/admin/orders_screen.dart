import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/order_service.dart';
import '../../services/auth_service.dart';
import '../../database/app_constants.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  List<OrderModel> _orders = [];
  List<UserModel> _riders = [];
  bool _loading = true;
  OrderStatus? _filterStatus;
  String _search = '';
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
    final results = await Future.wait([
      OrderService.instance.getAllOrders(),
      AuthService.instance.getAllRiders(),
    ]);
    if (mounted) {
      setState(() {
        _orders = results[0] as List<OrderModel>;
        _riders = results[1] as List<UserModel>;
        _loading = false;
      });
    }
  }

  List<OrderModel> get _filtered {
    return _orders.where((o) {
      if (_filterStatus != null && o.status != _filterStatus) return false;
      if (_search.isNotEmpty) {
        final q = _search.toLowerCase();
        return o.orderId.toLowerCase().contains(q) ||
            o.itemName.toLowerCase().contains(q) ||
            o.recipient.toLowerCase().contains(q) ||
            (o.assignedRiderName?.toLowerCase().contains(q) ?? false);
      }
      return true;
    }).toList();
  }

  Future<void> _showAssignDialog(OrderModel order) async {
    UserModel? selected;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Assign Rider', style: CrymaText.headingMedium),
              const SizedBox(height: 4),
              Text(order.orderId, style: CrymaText.bodyMedium),
              const SizedBox(height: 16),
              DropdownButtonFormField<UserModel>(
                decoration: const InputDecoration(labelText: 'Select Rider'),
                items: _riders.map((r) => DropdownMenuItem(value: r, child: Text(r.fullName))).toList(),
                onChanged: (v) => setModal(() => selected = v),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: selected == null
                    ? null
                    : () async {
                        Navigator.pop(ctx);
                        await OrderService.instance.assignRider(order.orderId, selected!.id);
                        _load();
                      },
                child: const Text('Assign'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showStatusDialog(OrderModel order) async {
    OrderStatus selected = order.status;
    await showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Update Status', style: CrymaText.headingMedium),
              const SizedBox(height: 16),
              RadioGroup<OrderStatus>(
                groupValue: selected,
                onChanged: (v) => setModal(() => selected = v!),
                child: Column(
                  children: OrderStatus.values.map((s) => RadioListTile<OrderStatus>(
                        value: s,
                        title: Text(s.label),
                        contentPadding: EdgeInsets.zero,
                      )).toList(),
                ),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await OrderService.instance.updateStatus(order.orderId, selected);
                  _load();
                },
                child: const Text('Update'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders / Items'),
        leading: BackButton(onPressed: () => context.go('/admin')),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Create Order',
            onPressed: () => context.go('/admin/orders/create'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search by order ID, item, recipient...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(icon: const Icon(Icons.clear), onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); })
                          : null,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      _FilterChip(label: 'All', selected: _filterStatus == null, onTap: () => setState(() => _filterStatus = null)),
                      ...OrderStatus.values.map((s) => _FilterChip(
                            label: s.label,
                            selected: _filterStatus == s,
                            onTap: () => setState(() => _filterStatus = s),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: filtered.isEmpty
                      ? const EmptyState(icon: Icons.inventory_2_outlined, title: 'No orders found.', subtitle: 'Try a different filter.')
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _OrderCard(
                              order: filtered[i],
                              onAssign: () => _showAssignDialog(filtered[i]),
                              onUpdateStatus: () => _showStatusDialog(filtered[i]),
                              onDelete: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('Delete Order'),
                                    content: Text('Delete ${filtered[i].orderId}? This cannot be undone.'),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: CrymaColors.error))),
                                    ],
                                  ),
                                );
                                if (confirm == true) {
                                  await OrderService.instance.deleteOrder(filtered[i].orderId);
                                  _load();
                                }
                              },
                            ),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(label: Text(label), selected: selected, onSelected: (_) => onTap()),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  final VoidCallback onAssign;
  final VoidCallback onUpdateStatus;
  final VoidCallback onDelete;
  const _OrderCard({required this.order, required this.onAssign, required this.onUpdateStatus, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: CrymaColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(order.orderId, style: CrymaText.headingSmall)),
              StatusBadge(status: order.status),
            ],
          ),
          const SizedBox(height: 6),
          Text(order.itemName, style: CrymaText.bodyLarge),
          const SizedBox(height: 4),
          Text('To: ${order.recipient}', style: CrymaText.bodyMedium),
          Text('Destination: ${order.destination}', style: CrymaText.bodyMedium),
          if (order.assignedRiderName != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.person_outline, size: 14, color: CrymaColors.textSecondary),
              const SizedBox(width: 4),
              Text(order.assignedRiderName!, style: CrymaText.bodyMedium),
            ]),
          ],
          if (order.isDummy) ...[
            const SizedBox(height: 4),
            const Text('Dummy Order', style: TextStyle(fontSize: 11, color: CrymaColors.textHint)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onUpdateStatus,
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 8)),
                  child: const Text('Status'),
                ),
              ),
              const SizedBox(width: 8),
              if (order.assignedRiderId == null)
                Expanded(
                  child: FilledButton(
                    onPressed: onAssign,
                    style: FilledButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 8)),
                    child: const Text('Assign'),
                  ),
                ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: CrymaColors.error),
                onPressed: onDelete,
                style: IconButton.styleFrom(minimumSize: const Size(36, 36)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

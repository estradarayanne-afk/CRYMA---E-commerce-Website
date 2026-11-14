import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/order_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';
import 'qr_scanner_screen.dart';

class DeliveryDetailScreen extends StatefulWidget {
  final String orderId;
  const DeliveryDetailScreen({super.key, required this.orderId});

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  OrderModel? _order;
  bool _loading = true;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final order = await OrderService.instance.getOrderByOrderId(widget.orderId);
    if (mounted) setState(() { _order = order; _loading = false; });
  }

  void _snack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  // ── Accept order (RID-JOB-001, RID-JOB-006) ───────────────────────────────
  Future<void> _acceptOrder() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final active = await OrderService.instance.countActiveJobsForRider(riderId);
    if (active >= 3) {
      _snack('You already have 3 active jobs. Complete one before accepting more.');
      return;
    }
    setState(() => _updating = true);
    await OrderService.instance.assignRider(widget.orderId, riderId);
    await _load();
    setState(() => _updating = false);
  }

  // ── Pickup confirmation (RID-PICK-002, RID-PICK-003, RID-PICK-004) ─────────
  Future<void> _confirmPickup(OrderModel o) async {
    final input = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => _TrackingInputScreen(
          trackingNumber: o.trackingNumber ?? '',
          orderId: o.orderId,
        ),
      ),
    );
    if (input == null) return;
    setState(() => _updating = true);
    final err = await OrderService.instance.confirmPickup(o.orderId, input);
    await _load();
    setState(() => _updating = false);
    if (err != null && mounted) _snack(err);
  }

  // ── Delivery confirmation (RID-DLV-001 to RID-DLV-009) ────────────────────
  Future<void> _confirmDelivery(OrderModel o) async {
    final qr = o.qrCode;
    if (qr == null || qr.isEmpty) { _snack('This parcel has no QR code.'); return; }

    // Step 1: Scan QR (live camera — RID-DLV-008)
    final scanned = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => QrScannerScreen(
          expectedQrCode: qr,
          title: 'Scan Parcel QR',
          instruction: 'Scan the parcel QR code to confirm delivery.',
        ),
      ),
    );
    if (scanned != true || !mounted) return;

    // Step 2: Take POD photo (live camera only — RID-DLV-008)
    final photo = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 85);
    if (photo == null || !mounted) return;

    // Step 3: OTP + COD dialog
    await _showDeliveryDialog(o, photo.path, qr);
  }

  Future<void> _showDeliveryDialog(OrderModel o, String photoPath, String scannedQr) async {
    final otpCtrl = TextEditingController();
    final codCtrl = TextEditingController(
        text: o.codAmount > 0 ? o.codAmount.toStringAsFixed(2) : '');
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        final errors = <String?>[''];
        return StatefulBuilder(
          builder: (ctx, setInner) => Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 32),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: Container(width: 36, height: 4,
                      decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 16),
                  const Text('Confirm Delivery', style: CrymaText.headingMedium),
                  const SizedBox(height: 8),
                  Container(
                    height: 120,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), border: Border.all(color: CrymaColors.divider)),
                    clipBehavior: Clip.antiAlias,
                    child: Image.file(File(photoPath), fit: BoxFit.cover),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: otpCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    decoration: const InputDecoration(labelText: 'Delivery OTP (6 digits)', prefixIcon: Icon(Icons.lock_outline), hintText: 'Ask buyer for OTP'),
                    validator: (v) => (v == null || v.trim().length != 6) ? 'Enter the 6-digit OTP.' : null,
                  ),
                  if (o.codAmount > 0) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: codCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: 'COD Amount (₱${o.codAmount.toStringAsFixed(2)})', prefixIcon: const Icon(Icons.payments_outlined)),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Enter COD amount.';
                        final parsed = double.tryParse(v.trim());
                        if (parsed == null) return 'Invalid amount.';
                        if ((parsed - o.codAmount).abs() > 0.001) return 'Amount must be exactly ₱${o.codAmount.toStringAsFixed(2)}.';
                        return null;
                      },
                    ),
                  ] else
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text('Prepaid order — no COD required.', style: TextStyle(fontSize: 12, color: CrymaColors.textSecondary)),
                    ),
                  if (errors[0] != null && errors[0]!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: CrymaColors.errorSurface, borderRadius: BorderRadius.circular(8)),
                      child: Text(errors[0]!, style: const TextStyle(fontSize: 12, color: CrymaColors.error)),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      if (!formKey.currentState!.validate()) return;
                      final codVal = o.codAmount > 0 ? double.tryParse(codCtrl.text.trim()) ?? 0 : 0.0;
                      Navigator.pop(ctx, {'otp': otpCtrl.text.trim(), 'cod': codVal});
                    },
                    child: const Text('Mark as Delivered'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    otpCtrl.dispose();
    codCtrl.dispose();
    if (result == null || !mounted) return;

    setState(() => _updating = true);
    final err = await OrderService.instance.confirmDelivery(
      orderId: o.orderId,
      scannedQr: scannedQr,
      otp: result['otp'] as String,
      codEntered: result['cod'] as double,
      podPhotoPath: photoPath,
    );
    await _load();
    setState(() => _updating = false);
    if (err != null && mounted) _snack(err);
  }

  // ── Failed delivery (RID-FAIL-001 to RID-FAIL-005) ─────────────────────────
  Future<void> _markFailed(OrderModel o) async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        String? selected;
        return StatefulBuilder(
          builder: (ctx, setInner) => Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(child: Container(width: 36, height: 4,
                    decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                const Text('Mark Failed Delivery', style: CrymaText.headingMedium),
                const SizedBox(height: 4),
                Text('Attempt ${o.deliveryAttempt + 1} of 3',
                    style: const TextStyle(fontSize: 13, color: CrymaColors.textSecondary)),
                const SizedBox(height: 14),
                ...OrderService.failedDeliveryReasons.map((r) => InkWell(
                  onTap: () => setInner(() => selected = r),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(children: [
                      Container(
                        width: 20, height: 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: selected == r ? CrymaColors.primary : CrymaColors.divider, width: 2),
                          color: selected == r ? CrymaColors.primary : Colors.transparent,
                        ),
                        child: selected == r ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                      ),
                      const SizedBox(width: 12),
                      Text(r, style: const TextStyle(fontSize: 14)),
                    ]),
                  ),
                )),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: selected == null ? null : () => Navigator.pop(ctx, selected),
                  child: const Text('Confirm Failed Delivery'),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (reason == null || !mounted) return;
    setState(() => _updating = true);
    final err = await OrderService.instance.markFailedDelivery(o.orderId, reason);
    await _load();
    setState(() => _updating = false);
    if (err != null && mounted) _snack(err);
  }

  void _showParcelQr(OrderModel o) => showDialog(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Parcel QR Code'),
      content: o.qrCode == null
          ? const Text('No QR code available.')
          : Column(mainAxisSize: MainAxisSize.min, children: [
              QrImageView(data: o.qrCode!, size: 220),
              const SizedBox(height: 12),
              Text('Order: ${o.orderId}', textAlign: TextAlign.center),
              if (o.trackingNumber != null) ...[
                const SizedBox(height: 4),
                Text('Tracking: ${o.trackingNumber}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
              ],
            ]),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
    ),
  );

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order'), leading: BackButton(onPressed: () => context.go('/rider/deliveries'))),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order'), leading: BackButton(onPressed: () => context.go('/rider/deliveries'))),
        body: const EmptyState(icon: Icons.search_off_outlined, title: 'Order not found', subtitle: 'This order may have been removed.'),
      );
    }

    final o = _order!;
    return Scaffold(
      appBar: AppBar(title: Text(o.orderId), leading: BackButton(onPressed: () => context.go('/rider/deliveries'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: _statusSurface(o.status), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                Icon(_statusIcon(o.status), color: _statusColor(o.status), size: 28),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(o.status.label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: _statusColor(o.status))),
                  Text(_statusSubtitle(o), style: TextStyle(fontSize: 12, color: _statusColor(o.status).withValues(alpha: 0.8))),
                ])),
              ]),
            ),
            const SizedBox(height: 24),

            const Text('Order Information', style: CrymaText.headingSmall),
            const SizedBox(height: 14),
            _DetailRow(icon: Icons.tag, label: 'Order ID', value: o.orderId),
            if (o.trackingNumber != null)
              _DetailRow(icon: Icons.qr_code_2, label: 'Tracking Number', value: o.trackingNumber!),
            TextButton.icon(
                onPressed: () => _showParcelQr(o),
                icon: const Icon(Icons.qr_code),
                label: const Text('View Parcel QR Code')),
            _DetailRow(icon: Icons.inventory_2_outlined, label: 'Item', value: o.itemName),
            if (o.itemDescription != null && o.itemDescription!.isNotEmpty)
              _DetailRow(icon: Icons.notes_outlined, label: 'Description', value: o.itemDescription!),
            if (o.sender != null && o.sender!.isNotEmpty)
              _DetailRow(icon: Icons.person_outline, label: 'Sender', value: o.sender!),
            _DetailRow(icon: Icons.person_pin_outlined, label: 'Recipient', value: o.recipient),
            if (o.pickupLocation != null && o.pickupLocation!.isNotEmpty)
              _DetailRow(icon: Icons.store_outlined, label: 'Pickup', value: o.pickupLocation!),
            _DetailRow(icon: Icons.location_on_outlined, label: 'Destination', value: o.destination),
            if (o.codAmount > 0)
              _DetailRow(icon: Icons.payments_outlined, label: 'COD Amount', value: '₱${o.codAmount.toStringAsFixed(2)}'),
            if (o.failedReason != null)
              _DetailRow(icon: Icons.warning_amber_outlined, label: 'Failed Reason', value: o.failedReason!),
            // POD photo
            Builder(builder: (_) {
              final pod = o.podPhotoPath;
              if (pod == null) return const SizedBox.shrink();
              return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const SizedBox(height: 8),
                const Text('Proof of Delivery', style: CrymaText.headingSmall),
                const SizedBox(height: 8),
                ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.file(File(pod), height: 160, fit: BoxFit.cover)),
              ]);
            }),
            const SizedBox(height: 32),
            if (_updating)
              const Center(child: CircularProgressIndicator())
            else
              _buildAction(o),
          ],
        ),
      ),
    );
  }

  Widget _buildAction(OrderModel o) {
    if (o.assignedRiderId == null && o.status == OrderStatus.forPickUp) {
      return FilledButton(onPressed: _acceptOrder, child: const Text('Accept Order'));
    }
    if (o.status == OrderStatus.assigned) {
      return FilledButton(onPressed: () => _confirmPickup(o), child: const Text('Confirm Pickup'));
    }
    if (o.status == OrderStatus.pickedUp || o.status == OrderStatus.atSortingCenter) {
      return FilledButton(
          onPressed: () => OrderService.instance.updateStatus(widget.orderId, OrderStatus.outForDelivery).then((_) => _load()),
          child: const Text('Start Delivery to Buyer'));
    }
    if (o.status == OrderStatus.outForDelivery) {
      return Column(children: [
        FilledButton(onPressed: () => _confirmDelivery(o), child: const Text('Mark as Delivered')),
        const SizedBox(height: 10),
        OutlinedButton(
            onPressed: () => _markFailed(o),
            style: OutlinedButton.styleFrom(foregroundColor: CrymaColors.error, side: const BorderSide(color: CrymaColors.error)),
            child: const Text('Mark Failed Delivery')),
      ]);
    }
    if (o.status == OrderStatus.failedDelivery) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: CrymaColors.warningSurface, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.hourglass_top_outlined, color: CrymaColors.warning, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text('Attempt ${o.deliveryAttempt} of 3 failed. Awaiting reschedule by admin.',
              style: const TextStyle(fontSize: 13, color: CrymaColors.warning))),
        ]),
      );
    }
    if (o.status == OrderStatus.delivered) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: CrymaColors.statusDeliveredSurface, borderRadius: BorderRadius.circular(12)),
        child: Column(children: [
          const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.check_circle, color: CrymaColors.statusDelivered),
            SizedBox(width: 8),
            Text('Delivery Completed', style: TextStyle(color: CrymaColors.statusDelivered, fontWeight: FontWeight.w600)),
          ]),
          if (o.pickupPay > 0 || o.deliveryPay > 0) ...[
            const SizedBox(height: 8),
            Text('Earned: ₱${(o.pickupPay + o.deliveryPay).toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 13, color: CrymaColors.statusDelivered)),
          ],
        ]),
      );
    }
    if (o.status == OrderStatus.returnToSender) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: CrymaColors.errorSurface, borderRadius: BorderRadius.circular(12)),
        child: const Row(children: [
          Icon(Icons.undo_outlined, color: CrymaColors.error, size: 20),
          SizedBox(width: 10),
          Expanded(child: Text('Return to Sender', style: TextStyle(fontSize: 13, color: CrymaColors.error, fontWeight: FontWeight.w600))),
        ]),
      );
    }
    return const SizedBox.shrink();
  }

  Color _statusColor(OrderStatus s) => switch (s) {
        OrderStatus.forPickUp => CrymaColors.statusPending,
        OrderStatus.assigned => CrymaColors.statusPending,
        OrderStatus.pickedUp => CrymaColors.statusInTransit,
        OrderStatus.onTransit => CrymaColors.statusInTransit,
        OrderStatus.atSortingCenter => CrymaColors.statusAtSorting,
        OrderStatus.outForDelivery => CrymaColors.statusOutForDelivery,
        OrderStatus.delivered => CrymaColors.statusDelivered,
        OrderStatus.failedDelivery => CrymaColors.warning,
        OrderStatus.returnToSender => CrymaColors.error,
      };

  Color _statusSurface(OrderStatus s) => switch (s) {
        OrderStatus.forPickUp => CrymaColors.statusPendingSurface,
        OrderStatus.assigned => CrymaColors.statusPendingSurface,
        OrderStatus.pickedUp => CrymaColors.statusInTransitSurface,
        OrderStatus.onTransit => CrymaColors.statusInTransitSurface,
        OrderStatus.atSortingCenter => CrymaColors.statusAtSortingSurface,
        OrderStatus.outForDelivery => CrymaColors.statusOutForDeliverySurface,
        OrderStatus.delivered => CrymaColors.statusDeliveredSurface,
        OrderStatus.failedDelivery => CrymaColors.warningSurface,
        OrderStatus.returnToSender => CrymaColors.errorSurface,
      };

  IconData _statusIcon(OrderStatus s) => switch (s) {
        OrderStatus.forPickUp => Icons.schedule_outlined,
        OrderStatus.assigned => Icons.assignment_outlined,
        OrderStatus.pickedUp => Icons.inventory_outlined,
        OrderStatus.onTransit => Icons.local_shipping_outlined,
        OrderStatus.atSortingCenter => Icons.warehouse_outlined,
        OrderStatus.outForDelivery => Icons.delivery_dining_outlined,
        OrderStatus.delivered => Icons.check_circle_outline,
        OrderStatus.failedDelivery => Icons.warning_amber_outlined,
        OrderStatus.returnToSender => Icons.undo_outlined,
      };

  String _statusSubtitle(OrderModel o) => switch (o.status) {
        OrderStatus.forPickUp => 'Ready for pickup.',
        OrderStatus.assigned => 'Scan or type tracking number to confirm pickup.',
        OrderStatus.pickedUp => 'Parcel picked up. Ready for delivery.',
        OrderStatus.onTransit => 'Parcel is on the way.',
        OrderStatus.atSortingCenter => 'Parcel is at sorting center.',
        OrderStatus.outForDelivery => 'Out for final delivery.',
        OrderStatus.delivered => 'Parcel has been delivered.',
        OrderStatus.failedDelivery => 'Attempt ${o.deliveryAttempt} of 3 — ${o.failedReason ?? 'failed'}.',
        OrderStatus.returnToSender => 'Returning to sender.',
      };
}

// ── Tracking number input screen (scan or type) ───────────────────────────────
class _TrackingInputScreen extends StatefulWidget {
  final String trackingNumber;
  final String orderId;
  const _TrackingInputScreen({required this.trackingNumber, required this.orderId});

  @override
  State<_TrackingInputScreen> createState() => _TrackingInputScreenState();
}

class _TrackingInputScreenState extends State<_TrackingInputScreen> {
  final _ctrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _showManual = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confirm Pickup'), leading: BackButton(onPressed: () => Navigator.of(context).pop())),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Scan or enter the tracking number on the waybill.', style: CrymaText.bodyLarge),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () async {
                final result = await Navigator.of(context).push<bool>(MaterialPageRoute(
                  builder: (_) => QrScannerScreen(
                    expectedQrCode: widget.trackingNumber,
                    title: 'Scan Waybill Barcode',
                    instruction: 'Scan the tracking number barcode on the waybill.',
                  ),
                ));
                if (result == true && context.mounted) {
                  Navigator.of(context).pop(widget.trackingNumber);
                }
              },
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Scan Barcode'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => setState(() => _showManual = !_showManual),
              icon: const Icon(Icons.keyboard_outlined),
              label: const Text('Enter Tracking Number'),
            ),
            if (_showManual) ...[
              const SizedBox(height: 16),
              Form(
                key: _formKey,
                child: TextFormField(
                  controller: _ctrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'Tracking Number', prefixIcon: Icon(Icons.tag), hintText: 'e.g. TRK-XXXXXXX'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required.' : null,
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () { if (_formKey.currentState!.validate()) Navigator.of(context).pop(_ctrl.text.trim()); },
                child: const Text('Confirm'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: CrymaColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: CrymaText.caption),
              const SizedBox(height: 2),
              Text(value, style: CrymaText.bodyLarge),
            ],
          )),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../services/order_service.dart';
import '../../services/auth_service.dart';
import '../../database/app_constants.dart';

class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _itemNameCtrl = TextEditingController();
  final _itemDescCtrl = TextEditingController();
  final _senderCtrl = TextEditingController();
  final _recipientCtrl = TextEditingController();
  final _pickupCtrl = TextEditingController();
  final _destinationCtrl = TextEditingController();

  OrderStatus _status = OrderStatus.forPickUp;
  UserModel? _assignedRider;
  List<UserModel> _riders = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    AuthService.instance.getAllRiders().then((r) {
      if (mounted) setState(() => _riders = r);
    });
  }

  @override
  void dispose() {
    _itemNameCtrl.dispose();
    _itemDescCtrl.dispose();
    _senderCtrl.dispose();
    _recipientCtrl.dispose();
    _pickupCtrl.dispose();
    _destinationCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final orderId = await OrderService.instance.createOrder(
      itemName: _itemNameCtrl.text,
      itemDescription: _itemDescCtrl.text.isEmpty ? null : _itemDescCtrl.text,
      sender: _senderCtrl.text.isEmpty ? null : _senderCtrl.text,
      recipient: _recipientCtrl.text,
      pickupLocation: _pickupCtrl.text.isEmpty ? null : _pickupCtrl.text,
      destination: _destinationCtrl.text,
      status: _status,
      assignedRiderId: _assignedRider?.id,
      isDummy: true,
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (orderId != null) {
      if (!mounted) return;
      final qrData = OrderService.generateQrCode(orderId);
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => _QrDialog(orderId: orderId, qrData: qrData),
      );
      if (!mounted) return;
      context.go('/admin/orders');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Failed to create order. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Test Pickup Item'),
        leading: BackButton(onPressed: () => context.go('/admin/orders')),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            TextFormField(
              controller: _itemNameCtrl,
              decoration: const InputDecoration(labelText: 'Item Name *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _itemDescCtrl,
              decoration: const InputDecoration(labelText: 'Item Description'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _senderCtrl,
              decoration: const InputDecoration(labelText: 'Sender'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _recipientCtrl,
              decoration: const InputDecoration(labelText: 'Recipient *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _pickupCtrl,
              decoration: const InputDecoration(labelText: 'Pickup Location *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _destinationCtrl,
              decoration: const InputDecoration(labelText: 'Destination *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<OrderStatus>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Initial Status'),
              items: OrderStatus.values
                  .map((s) => DropdownMenuItem(value: s, child: Text(s.label)))
                  .toList(),
              onChanged: (v) => setState(() => _status = v!),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<UserModel>(
              initialValue: _assignedRider,
              decoration:
                  const InputDecoration(labelText: 'Assign Rider (optional)'),
              items: [
                const DropdownMenuItem(value: null, child: Text('None')),
                ..._riders.map(
                    (r) => DropdownMenuItem(value: r, child: Text(r.fullName))),
              ],
              onChanged: (v) => setState(() => _assignedRider = v),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Create Order'),
            ),
          ],
        ),
      ),
    );
  }
}

class _QrDialog extends StatelessWidget {
  final String orderId;
  final String qrData;
  const _QrDialog({required this.orderId, required this.qrData});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Order Created'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Order ID: $orderId',
              style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
          const SizedBox(height: 4),
          const Text('Print and attach this QR code to the parcel.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 16),
          QrImageView(data: qrData, size: 200),
          const SizedBox(height: 8),
          Text(qrData,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
      actions: [
        FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Done')),
      ],
    );
  }
}

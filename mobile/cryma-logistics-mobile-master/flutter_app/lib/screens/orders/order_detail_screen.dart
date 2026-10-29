import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../models/order_model.dart';
import '../../providers/order_provider.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({Key? key, required this.orderId}) : super(key: key);

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _recipientController = TextEditingController();
  Order? _order;
  String? _photoPath;
  String? _error;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    _recipientController.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await context.read<OrderProvider>().getOrderDetail(
        widget.orderId,
      );
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  String? _nextStatus(Order order) {
    if (order.taskType == 'pickup') {
      switch (order.status) {
        case 'ASSIGNED_TO_PICKUP_RIDER':
          return 'ACCEPTED_BY_PICKUP_RIDER';
        case 'ACCEPTED_BY_PICKUP_RIDER':
          return 'PICKED_UP';
        case 'PICKED_UP':
          return 'AT_SORTING_CENTER';
      }
    } else if (order.status == 'ASSIGNED_TO_RIDER') {
      return 'OUT_FOR_DELIVERY';
    }
    return null;
  }

  Future<void> _updateStatus() async {
    final order = _order;
    final next = order == null ? null : _nextStatus(order);
    if (order == null || next == null) return;
    setState(() => _saving = true);
    try {
      final updated = await context.read<OrderProvider>().updateTaskStatus(
        order,
        next,
      );
      if (mounted) setState(() => _order = updated);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _chooseProofPhoto() async {
    try {
      final photo = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      if (photo != null && mounted) setState(() => _photoPath = photo.path);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open the camera: $error')),
        );
      }
    }
  }

  Future<void> _completeDelivery() async {
    final order = _order;
    if (order == null) return;
    if (_recipientController.text.trim().isEmpty || _photoPath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Enter the recipient name and capture a delivery photo.',
          ),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final updated = await context.read<OrderProvider>().completeDelivery(
        order: order,
        recipientName: _recipientController.text,
        photoPath: _photoPath!,
      );
      if (mounted) {
        setState(() {
          _order = updated;
          _photoPath = null;
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final nextStatus = order == null ? null : _nextStatus(order);
    return Scaffold(
      appBar: AppBar(title: const Text('Task Details')),
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
                    TextButton(
                      onPressed: _loadOrder,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : order == null
          ? const Center(child: Text('Task not found.'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order.orderId}',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Task: ${order.taskType == 'pickup' ? 'Pickup' : 'Delivery'}',
                        ),
                        Text('Status: ${order.statusLabel}'),
                        if (order.itemName.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text('Items: ${order.itemName}'),
                        ],
                      ],
                    ),
                  ),
                ),
                if (order.pickupAddress != null &&
                    order.pickupAddress!.isNotEmpty)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.store),
                      title: const Text('Pickup Address'),
                      subtitle: Text(order.pickupAddress!),
                    ),
                  ),
                if (order.deliveryAddress != null &&
                    order.deliveryAddress!.isNotEmpty)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.location_on_outlined),
                      title: const Text('Delivery Address'),
                      subtitle: Text(order.deliveryAddress!),
                    ),
                  ),
                if (nextStatus != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: ElevatedButton(
                      onPressed: _saving ? null : _updateStatus,
                      child: _saving
                          ? const CircularProgressIndicator()
                          : Text(switch (nextStatus) {
                              'ACCEPTED_BY_PICKUP_RIDER' => 'Accept Pickup',
                              'PICKED_UP' => 'Confirm Parcel Collected',
                              'AT_SORTING_CENTER' =>
                                'Confirm Sorting Center Handover',
                              _ => 'Start Delivery',
                            }),
                    ),
                  )
                else if (order.taskType == 'delivery' &&
                    order.status == 'OUT_FOR_DELIVERY')
                  Card(
                    margin: const EdgeInsets.only(top: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Delivery Proof',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _recipientController,
                            decoration: const InputDecoration(
                              labelText: 'Recipient full name',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: _saving ? null : _chooseProofPhoto,
                            icon: const Icon(Icons.camera_alt_outlined),
                            label: Text(
                              _photoPath == null
                                  ? 'Capture Delivery Photo'
                                  : 'Photo Captured',
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _saving ? null : _completeDelivery,
                            child: _saving
                                ? const CircularProgressIndicator()
                                : const Text('Submit Proof and Complete'),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

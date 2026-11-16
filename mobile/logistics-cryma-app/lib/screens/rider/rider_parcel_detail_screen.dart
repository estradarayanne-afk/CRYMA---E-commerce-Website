import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../models/courier_parcel.dart';
import '../../services/api_client.dart';
import '../../services/courier_service.dart';
import '../../theme.dart';
import 'qr_scanner_screen.dart';

class RiderParcelDetailScreen extends StatefulWidget {
  const RiderParcelDetailScreen({
    super.key,
    required this.type,
    required this.id,
  });

  final CourierTaskType type;
  final int id;

  @override
  State<RiderParcelDetailScreen> createState() =>
      _RiderParcelDetailScreenState();
}

class _RiderParcelDetailScreenState extends State<RiderParcelDetailScreen> {
  CourierParcel? _parcel;
  bool _loading = true;
  bool _updating = false;
  String? _error;

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
      final parcel =
          await CourierService.instance.getParcel(widget.type, widget.id);
      if (!mounted) return;
      setState(() {
        _parcel = parcel;
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

  Future<void> _perform(Future<void> Function() action) async {
    setState(() {
      _updating = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) await _load();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<bool> _scanParcel(CourierParcel parcel) async {
    if (parcel.parcelCode.isEmpty) {
      setState(() => _error = 'This assignment has no parcel code.');
      return false;
    }
    final scanned = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => QrScannerScreen(
          expectedQrCode: parcel.parcelCode,
          title: 'Scan Parcel Code',
          instruction: 'Scan the parcel assigned to this task.',
        ),
      ),
    );
    return scanned == true && mounted;
  }

  Future<void> _collectPickup(CourierParcel parcel) async {
    if (!await _scanParcel(parcel) || !mounted) return;
    await _perform(() => CourierService.instance
        .collectPickup(parcel.id, parcel.parcelCode));
  }

  Future<void> _startDelivery(CourierParcel parcel) async {
    if (!await _scanParcel(parcel) || !mounted) return;
    await _perform(() => CourierService.instance
        .startDelivery(parcel.id, parcel.parcelCode));
  }

  Future<void> _completeDelivery(CourierParcel parcel) async {
    final image = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (image == null || !mounted) return;

    final details = await _requestProofDetails(parcel);
    if (details == null || !mounted) return;
    await _perform(
      () => CourierService.instance.completeDelivery(
        id: parcel.id,
        recipientName: details.recipientName,
        photoPath: image.path,
        codAmountCollected: details.codAmount,
      ),
    );
  }

  Future<_ProofDetails?> _requestProofDetails(CourierParcel parcel) async {
    final formKey = GlobalKey<FormState>();
    final recipientCtrl = TextEditingController();
    final codCtrl = TextEditingController(
      text: parcel.isCod ? parcel.codAmount.toStringAsFixed(2) : '',
    );
    final result = await showDialog<_ProofDetails>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Proof of Delivery'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: recipientCtrl,
                decoration: const InputDecoration(
                  labelText: 'Recipient full name',
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter the recipient’s full name.'
                    : null,
              ),
              if (parcel.isCod) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: codCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText:
                        'Cash collected (₱${parcel.codAmount.toStringAsFixed(2)})',
                  ),
                  validator: (value) {
                    final amount = double.tryParse(value?.trim() ?? '');
                    if (amount == null) return 'Enter a valid amount.';
                    if ((amount * 100).round() !=
                        (parcel.codAmount * 100).round()) {
                      return 'Cash collected must match the order total.';
                    }
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 12),
              const Text(
                'The photo and recipient details will be saved to the CRYMA order.',
                style: CrymaText.caption,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(
                context,
                _ProofDetails(
                  recipientName: recipientCtrl.text.trim(),
                  codAmount: parcel.isCod
                      ? double.parse(codCtrl.text.trim())
                      : null,
                ),
              );
            },
            child: const Text('Submit proof'),
          ),
        ],
      ),
    );
    recipientCtrl.dispose();
    codCtrl.dispose();
    return result;
  }

  Future<void> _failDelivery(CourierParcel parcel) async {
    final reasonCtrl = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unable to deliver'),
        content: TextField(
          controller: reasonCtrl,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Reason',
            hintText: 'Explain why delivery could not be completed',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = reasonCtrl.text.trim();
              if (value.isNotEmpty) Navigator.pop(context, value);
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    reasonCtrl.dispose();
    if (reason == null || !mounted) return;
    await _perform(
      () => CourierService.instance.failDelivery(parcel.id, reason),
    );
  }

  @override
  Widget build(BuildContext context) {
    final parcel = _parcel;
    return Scaffold(
      appBar: AppBar(
        title: Text(parcel?.typeLabel ?? 'Parcel'),
        leading: BackButton(onPressed: () => context.go('/rider/parcels')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : parcel == null
              ? _ErrorState(message: _error ?? 'Assignment not found.', onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: CrymaColors.palePink,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(parcel.statusLabel, style: CrymaText.headingSmall),
                            const SizedBox(height: 4),
                            Text(
                              parcel.isPickup
                                  ? 'Pickup assignment'
                                  : 'Delivery assignment',
                              style: CrymaText.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(color: CrymaColors.error),
                        ),
                      ],
                      const SizedBox(height: 22),
                      _InfoRow(
                        label: 'Parcel code',
                        value: parcel.parcelCode.isEmpty
                            ? 'Not available'
                            : parcel.parcelCode,
                      ),
                      _InfoRow(label: 'Order', value: '#${parcel.orderId}'),
                      _InfoRow(label: 'Items', value: parcel.itemSummary),
                      _InfoRow(label: 'Contact', value: parcel.counterparty),
                      _InfoRow(label: 'Address', value: parcel.address),
                      if (parcel.isCod)
                        _InfoRow(
                          label: 'Collect COD',
                          value: '₱${parcel.codAmount.toStringAsFixed(2)}',
                        ),
                      if (parcel.failureReason != null)
                        _InfoRow(
                          label: 'Last failure reason',
                          value: parcel.failureReason!,
                        ),
                      if (parcel.deliveryAttempts > 0)
                        _InfoRow(
                          label: 'Delivery attempts',
                          value: '${parcel.deliveryAttempts}',
                        ),
                      const SizedBox(height: 24),
                      if (_updating)
                        const Center(child: CircularProgressIndicator())
                      else
                        _actions(parcel),
                    ],
                  ),
                ),
    );
  }

  Widget _actions(CourierParcel parcel) {
    if (parcel.canAcceptPickup) {
      return FilledButton(
        onPressed: () =>
            _perform(() => CourierService.instance.acceptPickup(parcel.id)),
        child: const Text('Accept pickup'),
      );
    }
    if (parcel.canCollectPickup) {
      return FilledButton(
        onPressed: () => _collectPickup(parcel),
        child: const Text('Scan and confirm pickup'),
      );
    }
    if (parcel.canStartDelivery) {
      return FilledButton(
        onPressed: () => _startDelivery(parcel),
        child: const Text('Scan and start delivery'),
      );
    }
    if (parcel.canCompleteDelivery) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton(
            onPressed: () => _completeDelivery(parcel),
            child: const Text('Complete with proof'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => _failDelivery(parcel),
            child: const Text('Report failed delivery'),
          ),
        ],
      );
    }
    return const Text(
      'No action is available for this parcel status.',
      textAlign: TextAlign.center,
      style: CrymaText.bodyMedium,
    );
  }
}

class _ProofDetails {
  const _ProofDetails({required this.recipientName, this.codAmount});

  final String recipientName;
  final double? codAmount;
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: CrymaText.caption),
            const SizedBox(height: 3),
            Text(value, style: CrymaText.bodyLarge),
          ],
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      );
}

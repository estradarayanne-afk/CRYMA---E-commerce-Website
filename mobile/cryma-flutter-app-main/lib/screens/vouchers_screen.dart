import 'package:flutter/material.dart';

import '../models/buyer_voucher.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class VouchersScreen extends StatefulWidget {
  const VouchersScreen({super.key});

  @override
  State<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends State<VouchersScreen> {
  List<BuyerVoucher> _vouchers = [];
  bool _loading = true;
  String? _error;
  int? _claimingId;
  bool _showClaimed = true;

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
      final rows = await ApiService.instance.getBuyerVouchers();
      final vouchers = rows.map(BuyerVoucher.fromJson).toList();
      if (!mounted) return;
      setState(() {
        _vouchers = vouchers;
        _loading = false;
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Unable to load vouchers. Please try again.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _claim(BuyerVoucher voucher) async {
    if (_claimingId != null) return;
    setState(() => _claimingId = voucher.id);
    try {
      final result = await ApiService.instance.claimBuyerVoucher(voucher.id);
      if (result['success'] != true || result['data']?['is_claimed'] != true) {
        throw const ApiException('The voucher was not confirmed as claimed.');
      }
      if (!mounted) return;
      setState(() {
        _vouchers = _vouchers
            .map((item) =>
                item.id == voucher.id ? item.copyWith(isClaimed: true) : item)
            .toList();
        _showClaimed = true;
      });
      try {
        final refreshed = await ApiService.instance.getBuyerVouchers();
        if (mounted) {
          setState(
              () => _vouchers = refreshed.map(BuyerVoucher.fromJson).toList());
        }
      } catch (_) {
        // The successful claim response remains authoritative for this view.
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voucher added to your account.')),
      );
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    } catch (_) {
      if (mounted) _message('Unable to claim this voucher. Please try again.');
    } finally {
      if (mounted) setState(() => _claimingId = null);
    }
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  String _money(String? value) {
    final amount = double.tryParse(value ?? '');
    return amount == null ? '—' : '₱${amount.toStringAsFixed(2)}';
  }

  @override
  Widget build(BuildContext context) {
    final visible = _vouchers
        .where((voucher) => _showClaimed
            ? voucher.isClaimed
            : !voucher.isClaimed && voucher.buyerStatus == 'available')
        .toList();
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Vouchers'),
        foregroundColor: AppColors.primary,
        backgroundColor: AppColors.white,
        actions: [
          IconButton(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh))
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: true, label: Text('My vouchers')),
              ButtonSegment(value: false, label: Text('Available')),
            ],
            selected: {_showClaimed},
            onSelectionChanged: (selection) =>
                setState(() => _showClaimed = selection.first),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? _StateMessage(
                      message: _error!, action: 'Retry', onPressed: _load)
                  : visible.isEmpty
                      ? _StateMessage(
                          message: _showClaimed
                              ? 'No claimed vouchers yet.'
                              : 'No vouchers are available to claim.')
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: visible.length,
                            itemBuilder: (context, index) =>
                                _voucherCard(visible[index]),
                          ),
                        ),
        ),
      ]),
    );
  }

  Widget _voucherCard(BuyerVoucher voucher) {
    final canClaim = !voucher.isClaimed && voucher.buyerStatus == 'available';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.local_offer_outlined, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(voucher.discountLabel,
                      style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary)),
                  Text(voucher.code,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(voucher.isClaimed ? 'Claimed' : voucher.buyerStatus,
                      style: const TextStyle(color: AppColors.gray)),
                ])),
            if (canClaim)
              FilledButton(
                onPressed: _claimingId == null ? () => _claim(voucher) : null,
                child: _claimingId == voucher.id
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Claim'),
              ),
            if (voucher.isClaimed) const Chip(label: Text('In account')),
          ]),
          if (voucher.description?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Text(voucher.description!)
          ],
          if (voucher.sellerName?.isNotEmpty == true)
            Text('Store voucher · ${voucher.sellerName}'),
          if (voucher.statusReason?.isNotEmpty == true)
            Text(voucher.statusReason!,
                style: const TextStyle(color: AppColors.gray)),
          const SizedBox(height: 8),
          if ((double.tryParse(voucher.minimumSpend ?? '') ?? 0) > 0)
            Text('Minimum spend: ${_money(voucher.minimumSpend)}'),
          if (voucher.discountType == 'percentage' &&
              voucher.maximumDiscount != null)
            Text('Maximum discount: ${_money(voucher.maximumDiscount)}'),
          if (voucher.startsAt != null)
            Text(
                'Starts: ${voucher.startsAt!.toLocal().toString().split(' ').first}'),
          if (voucher.expiresAt != null)
            Text(
                'Expires: ${voucher.expiresAt!.toLocal().toString().split(' ').first}'),
          if (voucher.categories.isNotEmpty)
            Text('Categories: ${voucher.categories.join(', ')}'),
          if (voucher.eligibleProductNames.isNotEmpty)
            Text(
                'Eligible products: ${voucher.eligibleProductNames.join(', ')}'),
        ]),
      ),
    );
  }
}

class _StateMessage extends StatelessWidget {
  const _StateMessage({required this.message, this.action, this.onPressed});
  final String message;
  final String? action;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, textAlign: TextAlign.center),
            if (action != null)
              TextButton(onPressed: onPressed, child: Text(action!)),
          ]),
        ),
      );
}

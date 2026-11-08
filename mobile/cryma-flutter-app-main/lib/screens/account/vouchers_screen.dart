import 'package:flutter/material.dart';

import '../../models/buyer_voucher.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class VouchersScreen extends StatefulWidget {
  const VouchersScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends State<VouchersScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

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
      final rows = await _api.getBuyerVouchers();
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
      final result = await _api.claimBuyerVoucher(voucher.id);
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
        final refreshed = await _api.getBuyerVouchers();
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

  String _date(DateTime value) =>
      '${value.toLocal().year}-${value.toLocal().month.toString().padLeft(2, '0')}-${value.toLocal().day.toString().padLeft(2, '0')}';

  String _scopeLabel(BuyerVoucher voucher) {
    switch (voucher.scope) {
      case 'shipping':
        return 'Shipping voucher';
      case 'seller':
        return voucher.sellerName?.isNotEmpty == true
            ? voucher.sellerName!
            : 'Store voucher';
      default:
        return 'Product voucher';
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _vouchers
        .where((voucher) => _showClaimed
            ? voucher.isClaimed
            : !voucher.isClaimed && voucher.buyerStatus == 'available')
        .toList();
    final claimedCount = _vouchers.where((voucher) => voucher.isClaimed).length;
    final availableCount = _vouchers
        .where((voucher) =>
            !voucher.isClaimed && voucher.buyerStatus == 'available')
        .length;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 72,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('My Vouchers'),
            SizedBox(height: 2),
            Text(
              'Save more with your claimed offers.',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: AppColors.textSubtle,
              ),
            ),
          ],
        ),
        foregroundColor: AppColors.wine,
        backgroundColor: AppColors.background,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: AppColors.wine,
        ),
        actions: [
          IconButton(
              tooltip: 'Refresh vouchers',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded))
        ],
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(14, 2, 14, 12),
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 13),
            decoration: BoxDecoration(
              color: AppColors.softRose,
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: AppColors.borderNeutral),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.white.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.local_activity_rounded,
                    color: AppColors.primary,
                    size: 21,
                  ),
                ),
                const SizedBox(width: 11),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Offers for you',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.wine,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Choose a voucher and save at checkout.',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 10,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$availableCount available',
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: AppColors.borderNeutral),
            ),
            child: SegmentedButton<bool>(
              showSelectedIcon: false,
              style: ButtonStyle(
                textStyle: const WidgetStatePropertyAll(
                  TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                shape: WidgetStatePropertyAll(
                  RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              segments: [
                ButtonSegment(
                  value: true,
                  label: Text('My vouchers  ($claimedCount)'),
                ),
                ButtonSegment(
                  value: false,
                  label: Text('Available  ($availableCount)'),
                ),
              ],
              selected: {_showClaimed},
              onSelectionChanged: (selection) =>
                  setState(() => _showClaimed = selection.first),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 5, 18, 3),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _showClaimed ? 'YOUR VOUCHERS' : 'READY TO CLAIM',
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.7,
                      color: AppColors.textSubtle,
                    ),
                  ),
                ),
                Text(
                  '${visible.length} ${visible.length == 1 ? 'offer' : 'offers'}',
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 10,
                    color: AppColors.textSubtle,
                  ),
                ),
              ],
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
                                : 'No vouchers are available to claim.',
                            action: _showClaimed
                                ? 'Browse Available Vouchers'
                                : null,
                            onPressed: _showClaimed
                                ? () => setState(() => _showClaimed = false)
                                : null,
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                              itemCount: visible.length,
                              itemBuilder: (context, index) =>
                                  _voucherCard(visible[index]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _voucherCard(BuyerVoucher voucher) {
    final canClaim = !voucher.isClaimed && voucher.buyerStatus == 'available';
    final details = <Widget>[
      if ((double.tryParse(voucher.minimumSpend ?? '') ?? 0) > 0)
        _detailRow(
          Icons.shopping_bag_outlined,
          'Minimum spend',
          _money(voucher.minimumSpend),
        ),
      if (voucher.discountType == 'percentage' &&
          voucher.maximumDiscount != null)
        _detailRow(
          Icons.savings_outlined,
          'Maximum discount',
          _money(voucher.maximumDiscount),
        ),
      if (voucher.expiresAt != null)
        _detailRow(
          Icons.event_outlined,
          'Valid until',
          _date(voucher.expiresAt!),
        ),
      if (voucher.categories.isNotEmpty)
        _detailRow(
          Icons.category_outlined,
          'Categories',
          voucher.categories.join(', '),
        ),
      if (voucher.eligibleProductNames.isNotEmpty)
        _detailRow(
          Icons.inventory_2_outlined,
          'Eligible items',
          voucher.eligibleProductNames.join(', '),
        ),
    ];
    return Card(
      color: AppColors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.borderNeutral),
      ),
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(15, 15, 15, 13),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.softRose,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.local_offer_rounded,
                    color: AppColors.primary,
                    size: 21,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        voucher.discountLabel,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _scopeLabel(voucher),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSubtle,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _statusBadge(voucher),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.borderNeutral),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (voucher.description?.isNotEmpty == true)
                  Text(
                    voucher.description!,
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                if (voucher.statusReason?.isNotEmpty == true) ...[
                  if (voucher.description?.isNotEmpty == true)
                    const SizedBox(height: 6),
                  Text(
                    voucher.statusReason!,
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      color: AppColors.gray,
                      height: 1.4,
                    ),
                  ),
                ],
                if (details.isNotEmpty) ...[
                  if (voucher.description?.isNotEmpty == true ||
                      voucher.statusReason?.isNotEmpty == true)
                    const SizedBox(height: 12),
                  for (final detail in details) detail,
                ],
                if (voucher.startsAt != null) ...[
                  if (details.isNotEmpty) const SizedBox(height: 3),
                  _detailRow(
                    Icons.event_available_outlined,
                    'Starts',
                    _date(voucher.startsAt!),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(15, 11, 15, 11),
            decoration: const BoxDecoration(
              color: Color(0xFFFFF8F7),
              border: Border(
                top: BorderSide(color: AppColors.borderNeutral),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderStrong),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.confirmation_number_outlined,
                        size: 14,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        voucher.code,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                          color: AppColors.darkGray,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (canClaim)
                  SizedBox(
                    height: 38,
                    child: FilledButton(
                      onPressed:
                          _claimingId == null ? () => _claim(voucher) : null,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(11),
                        ),
                      ),
                      child: _claimingId == voucher.id
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: AppColors.white),
                            )
                          : const Text(
                              'Claim',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                  )
                else
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded,
                          size: 16, color: AppColors.success),
                      SizedBox(width: 5),
                      Text(
                        'In your wallet',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(BuyerVoucher voucher) {
    final claimed = voucher.isClaimed;
    final color = claimed ? AppColors.success : AppColors.primary;
    final background = claimed ? AppColors.successSoft : AppColors.softRose;
    final label = claimed ? 'CLAIMED' : voucher.buyerStatus.toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Poppins',
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
          color: color,
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: AppColors.textSubtle),
          const SizedBox(width: 7),
          Text(
            '$label: ',
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 10,
                color: AppColors.textSubtle,
                height: 1.35,
              ),
            ),
          ),
        ],
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

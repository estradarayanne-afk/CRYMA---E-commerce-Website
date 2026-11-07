import 'package:flutter/material.dart';

import '../../models/buyer_voucher.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class VoucherSelectionScreen extends StatefulWidget {
  const VoucherSelectionScreen({super.key, required this.items});
  final List<Map<String, dynamic>> items;

  @override
  State<VoucherSelectionScreen> createState() => _VoucherSelectionScreenState();
}

class _VoucherSelectionScreenState extends State<VoucherSelectionScreen> {
  final _codeController = TextEditingController();
  List<BuyerVoucher> _vouchers = [];
  String? _selectedCode;
  bool _loading = true;
  bool _validating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final rows = await ApiService.instance.getBuyerVouchers();
      if (!mounted) return;
      setState(() {
        _vouchers = rows
            .map(BuyerVoucher.fromJson)
            .where((v) => v.isClaimed && v.buyerStatus == 'available')
            .toList();
        _loading = false;
      });
    } catch (error) {
      if (mounted) setState(() { _error = error.toString(); _loading = false; });
    }
  }

  Future<void> _validateAndApply(String code) async {
    final trimmed = code.trim().toUpperCase();
    if (trimmed.isEmpty) {
      setState(() => _error = 'Enter or select a voucher code.');
      return;
    }
    if (_validating) return;
    setState(() { _validating = true; _error = null; });
    try {
      final data = await ApiService.instance.validateBuyerVoucher(
        code: trimmed,
        items: widget.items,
      );
      final validation = BuyerVoucherValidation.fromJson(data);
      if (!mounted) return;
      Navigator.pop(context, {
        'code': validation.code,
        'discount_amount': validation.discountAmount,
        'subtotal': validation.subtotal,
        'eligible_subtotal': validation.eligibleSubtotal,
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Unable to validate this voucher. Please try again.');
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  String _expiryLabel(BuyerVoucher voucher) {
    final expires = voucher.expiresAt;
    if (expires == null) return '';
    final days = expires.difference(DateTime.now()).inDays;
    if (days < 0) return 'Expired';
    if (days == 0) return 'Expires today';
    if (days == 1) return 'Expires tomorrow';
    if (days <= 7) return 'Expires in $days days';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final hasInput =
        _codeController.text.trim().isNotEmpty || _selectedCode != null;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Select Voucher'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: Column(
        children: [
          // ── CODE INPUT ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _codeController,
                    textCapitalization: TextCapitalization.characters,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (v) => _validateAndApply(v),
                    decoration: InputDecoration(
                      labelText: 'Voucher code',
                      hintText: 'e.g. WELCOME10',
                      prefixIcon: const Icon(Icons.local_offer_outlined,
                          color: AppColors.primary, size: 18),
                      suffixIcon: _codeController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: () {
                                _codeController.clear();
                                setState(() => _selectedCode = null);
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed:
                      _validating ? null : () => _validateAndApply(_codeController.text),
                  child: _validating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Apply',
                          style: TextStyle(fontFamily: 'Poppins')),
                ),
              ],
            ),
          ),

          // Error
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.dangerSoft,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    color: AppColors.danger,
                  ),
                ),
              ),
            ),

          // ── VOUCHER LIST ───────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _vouchers.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(28),
                          child: Column(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.local_offer_outlined,
                                size: 46, color: AppColors.primary),
                            SizedBox(height: 14),
                            Text(
                              'No claimed vouchers',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.darkGray,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Claim a voucher first, or enter a code above and tap Apply.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 13,
                                color: AppColors.gray,
                                height: 1.45,
                              ),
                            ),
                          ]),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                        itemCount: _vouchers.length,
                        itemBuilder: (context, index) {
                          final voucher = _vouchers[index];
                          final selected = _selectedCode == voucher.code;
                          final expiry = _expiryLabel(voucher);
                          return GestureDetector(
                            onTap: _validating
                                ? null
                                : () {
                                    setState(() {
                                      _selectedCode = voucher.code;
                                      _codeController.text = voucher.code;
                                      _error = null;
                                    });
                                  },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 160),
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: selected
                                    ? AppColors.softRose
                                    : AppColors.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: selected
                                      ? AppColors.primary
                                      : AppColors.borderNeutral,
                                  width: selected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    selected
                                        ? Icons.radio_button_checked
                                        : Icons.radio_button_off,
                                    color: selected
                                        ? AppColors.primary
                                        : AppColors.gray,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                voucher.code,
                                                style: const TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.darkGray,
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary
                                                    .withValues(alpha: 0.1),
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                voucher.discountLabel,
                                                style: const TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if ((double.tryParse(
                                                    voucher.minimumSpend ??
                                                        '') ??
                                                0) >
                                            0) ...[
                                          const SizedBox(height: 3),
                                          Text(
                                            'Min. spend ₱${voucher.minimumSpend}',
                                            style: const TextStyle(
                                              fontFamily: 'Poppins',
                                              fontSize: 11,
                                              color: AppColors.textSubtle,
                                            ),
                                          ),
                                        ],
                                        if (expiry.isNotEmpty) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            expiry,
                                            style: TextStyle(
                                              fontFamily: 'Poppins',
                                              fontSize: 11,
                                              color: expiry.contains('today') ||
                                                      expiry.contains('tomorrow')
                                                  ? AppColors.warning
                                                  : AppColors.textSubtle,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                        if (voucher.sellerName?.isNotEmpty ==
                                            true) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            'Store: ${voucher.sellerName}',
                                            style: const TextStyle(
                                              fontFamily: 'Poppins',
                                              fontSize: 11,
                                              color: AppColors.textSubtle,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),

      // Bottom apply button — only active when there is something to apply
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: SizedBox(
            height: 50,
            width: double.infinity,
            child: FilledButton(
              onPressed: hasInput && !_validating
                  ? () => _validateAndApply(
                      _selectedCode ?? _codeController.text)
                  : null,
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _validating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Validate and apply',
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../models/buyer_voucher.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class VoucherSelectionScreen extends StatefulWidget {
  const VoucherSelectionScreen({super.key, required this.items});
  final List<Map<String, dynamic>> items;

  @override
  State<VoucherSelectionScreen> createState() => _VoucherSelectionScreenState();
}

class _VoucherSelectionScreenState extends State<VoucherSelectionScreen> {
  final TextEditingController _codeController = TextEditingController();
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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ApiService.instance.getBuyerVouchers();
      if (!mounted) return;
      setState(() {
        _vouchers = rows
            .map(BuyerVoucher.fromJson)
            .where((voucher) =>
                voucher.isClaimed && voucher.buyerStatus == 'available')
            .toList();
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
          _error = 'Unable to load your vouchers.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _validateAndApply(String code) async {
    final normalized = code.trim();
    if (_validating) return;
    if (normalized.isEmpty) {
      setState(() => _error = 'Enter or select a voucher code.');
      return;
    }
    setState(() {
      _validating = true;
      _error = null;
    });
    try {
      final data = await ApiService.instance.validateBuyerVoucher(
        code: normalized,
        items: widget.items,
      );
      final validation = BuyerVoucherValidation.fromJson(data);
      if (!mounted) return;
      setState(() => _selectedCode = validation.code);
      Navigator.pop(context, {
        'code': validation.code,
        'discount_amount': validation.discountAmount,
        'subtotal': validation.subtotal,
        'eligible_subtotal': validation.eligibleSubtotal,
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } on FormatException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'Unable to validate this voucher. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
          title: const Text('Select Voucher'),
          foregroundColor: AppColors.primary,
          backgroundColor: AppColors.white),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
                child: TextField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                  labelText: 'Voucher code', border: OutlineInputBorder()),
              onChanged: (_) => setState(() => _selectedCode = null),
              onSubmitted: (value) => _validateAndApply(value),
            )),
            const SizedBox(width: 8),
            FilledButton(
                onPressed: _validating
                    ? null
                    : () => _validateAndApply(_codeController.text),
                child: const Text('Apply')),
          ]),
        ),
        if (_error != null)
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center)),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null && _vouchers.isEmpty
                  ? Center(
                      child: TextButton(
                          onPressed: _load, child: const Text('Retry')))
                  : _vouchers.isEmpty
                      ? const Center(
                          child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                  'No claimed, available vouchers. You can still enter a code and validate it for this checkout.',
                                  textAlign: TextAlign.center)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemCount: _vouchers.length,
                          itemBuilder: (context, index) {
                            final voucher = _vouchers[index];
                            final selected = _selectedCode == voucher.code;
                            return Card(
                              child: ListTile(
                                onTap: _validating
                                    ? null
                                    : () {
                                        setState(() {
                                          _selectedCode = voucher.code;
                                          _codeController.text = voucher.code;
                                        });
                                      },
                                leading: Icon(
                                  selected
                                      ? Icons.radio_button_checked
                                      : Icons.radio_button_off,
                                  color: selected ? AppColors.primary : null,
                                ),
                                title: Text(
                                    '${voucher.discountLabel} · ${voucher.code}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600)),
                                subtitle: Text([
                                  if ((double.tryParse(
                                              voucher.minimumSpend ?? '') ??
                                          0) >
                                      0)
                                    'Minimum spend ₱${voucher.minimumSpend}',
                                  if (voucher.expiresAt != null)
                                    'Expires ${voucher.expiresAt!.toLocal().toString().split(' ').first}',
                                  if (voucher.sellerName?.isNotEmpty == true)
                                    voucher.sellerName!,
                                ].join(' · ')),
                              ),
                            );
                          },
                        ),
        ),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: _validating
                    ? null
                    : () => _validateAndApply(
                        _selectedCode ?? _codeController.text),
                child: _validating
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Validate and apply'),
              )),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class RateFeedbackScreen extends StatefulWidget {
  const RateFeedbackScreen({super.key, this.orderId});
  final String? orderId;

  @override
  State<RateFeedbackScreen> createState() => _RateFeedbackScreenState();
}

class _RateFeedbackScreenState extends State<RateFeedbackScreen> {
  final _reviewController = TextEditingController();
  List<Map<String, dynamic>> _items = [];
  Map<String, dynamic>? _selectedItem;
  int _rating = 0;
  int _hoverRating = 0;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    if (widget.orderId == null) {
      setState(() {
        _error = 'Open this page from a completed order to review a product.';
        _loading = false;
      });
      return;
    }
    try {
      final order = await ApiService.instance.getBuyerOrder(widget.orderId!);
      final rows = (order['items'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .where((item) => item['product'] is Map<String, dynamic>)
          .toList();
      if (!mounted) return;
      setState(() {
        _items = rows;
        _selectedItem = rows.isEmpty ? null : rows.first;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  Future<void> _submit() async {
    final item = _selectedItem;
    final product = item?['product'] as Map<String, dynamic>?;
    final productId = product?['id']?.toString();
    final orderId = int.tryParse(widget.orderId ?? '');
    if (item == null || productId == null || orderId == null) {
      _snack('Choose a product from a completed order.');
      return;
    }
    if (_rating < 1 || _rating > 5) {
      _snack('Select a star rating before submitting.');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.instance.submitProductReview(
        productId: productId,
        orderId: orderId,
        rating: _rating,
        comment: _reviewController.text,
      );
      if (!mounted) return;
      _snack('Your review was submitted.');
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) _snack(error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final product = _selectedItem?['product'] as Map<String, dynamic>?;
    final productName = product?['name']?.toString() ?? 'Select a product';
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Rate & Review'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline, size: 42, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
                      const SizedBox(height: 14),
                      OutlinedButton(onPressed: _loadOrder, child: const Text('Try again')),
                    ]),
                  ),
                )
              : _items.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(28),
                        child: Text(
                          'No reviewable products were found in this order.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Poppins', fontSize: 14,
                            color: AppColors.gray,
                          ),
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      children: [
                        // ── PRODUCT SELECTOR ─────────────────────────────
                        if (_items.length > 1)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.borderNeutral),
                            ),
                            child: DropdownButtonFormField<Map<String, dynamic>>(
                              initialValue: _selectedItem,
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                labelText: 'Product',
                                labelStyle: TextStyle(fontFamily: 'Poppins'),
                              ),
                              items: _items.map((item) {
                                final p = item['product'] as Map<String, dynamic>;
                                return DropdownMenuItem(
                                  value: item,
                                  child: Text(p['name']?.toString() ?? 'Product',
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontFamily: 'Poppins')),
                                );
                              }).toList(),
                              onChanged: (item) =>
                                  setState(() => _selectedItem = item),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.borderNeutral),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.inventory_2_outlined,
                                    color: AppColors.primary, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(productName,
                                      style: const TextStyle(
                                        fontFamily: 'Poppins', fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.darkGray,
                                      )),
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 20),

                        // ── RATING CARD ──────────────────────────────────
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderNeutral),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Your rating',
                                style: TextStyle(
                                  fontFamily: 'Poppins', fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.darkGray,
                                ),
                              ),
                              const SizedBox(height: 12),
                              // Interactive star rating
                              Row(
                                children: List.generate(5, (index) {
                                  final i = index + 1;
                                  final active = i <= (_hoverRating > 0 ? _hoverRating : _rating);
                                  return GestureDetector(
                                    onTap: () => setState(() => _rating = i),
                                    onPanUpdate: (details) {
                                      // Allow swipe rating
                                      final box = context.findRenderObject() as RenderBox;
                                      final pos = box.globalToLocal(details.globalPosition);
                                      // Calculate which star based on position — approximate
                                      if (pos.dx > 0) setState(() => _rating = ((pos.dx / 50).ceil()).clamp(1, 5));
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.only(right: 4),
                                      child: MouseRegion(
                                        onEnter: (_) => setState(() => _hoverRating = i),
                                        onExit: (_) => setState(() => _hoverRating = 0),
                                        child: Icon(
                                          active ? Icons.star_rounded : Icons.star_outline_rounded,
                                          size: 36,
                                          color: active ? AppColors.gold : AppColors.borderStrong,
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(height: 20),
                              // ── COMMENT FIELD ────────────────────────────
                              const Text(
                                'Your review',
                                style: TextStyle(
                                  fontFamily: 'Poppins', fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.darkGray,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: _reviewController,
                                maxLength: 1000,
                                minLines: 4,
                                maxLines: 8,
                                decoration: InputDecoration(
                                  hintText: 'Share your experience with this product',
                                  hintStyle: const TextStyle(
                                    fontFamily: 'Poppins',
                                    color: AppColors.textSubtle,
                                  ),
                                  alignLabelWithHint: true,
                                  filled: true,
                                  fillColor: AppColors.background,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                height: 50,
                                child: FilledButton(
                                  onPressed: _submitting ? null : _submit,
                                  style: FilledButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  child: _submitting
                                      ? const SizedBox(
                                          width: 20, height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2, color: Colors.white,
                                          ),
                                        )
                                      : const Text(
                                          'Submit review',
                                          style: TextStyle(
                                            fontFamily: 'Poppins', fontSize: 15,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
    );
  }
}

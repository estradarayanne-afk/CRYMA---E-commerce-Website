import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

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
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final item = _selectedItem;
    final product = item?['product'] as Map<String, dynamic>?;
    final productId = product?['id']?.toString();
    final orderId = int.tryParse(widget.orderId ?? '');
    if (item == null || productId == null || orderId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Choose a product from a completed order.')));
      return;
    }
    if (_rating < 1 || _rating > 5) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Select a star rating before submitting.')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.instance.submitProductReview(
          productId: productId,
          orderId: orderId,
          rating: _rating,
          comment: _reviewController.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your review was submitted.')));
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = _selectedItem?['product'] as Map<String, dynamic>?;
    final productName = product?['name']?.toString() ?? 'Select a product';
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
          title: const Text('Rate & Review',
              style:
                  TextStyle(fontFamily: 'Poppins', color: AppColors.primary)),
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.primary,
          elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(
                            onPressed: _loadOrder,
                            child: const Text('Try again'))
                      ])))
              : _items.isEmpty
                  ? const Center(
                      child: Text(
                          'No reviewable products were found in this order.',
                          textAlign: TextAlign.center))
                  : ListView(padding: const EdgeInsets.all(16), children: [
                      if (_items.length > 1)
                        DropdownButtonFormField<Map<String, dynamic>>(
                          initialValue: _selectedItem,
                          decoration: const InputDecoration(
                              labelText: 'Product',
                              border: OutlineInputBorder(),
                              filled: true,
                              fillColor: Colors.white),
                          items: _items.map((item) {
                            final p = item['product'] as Map<String, dynamic>;
                            return DropdownMenuItem(
                                value: item,
                                child: Text(p['name']?.toString() ?? 'Product',
                                    overflow: TextOverflow.ellipsis));
                          }).toList(),
                          onChanged: (item) =>
                              setState(() => _selectedItem = item),
                        )
                      else
                        Card(
                            child: ListTile(
                                leading: const Icon(Icons.inventory_2_outlined,
                                    color: AppColors.primary),
                                title: Text(productName,
                                    style: const TextStyle(
                                        fontFamily: 'Poppins')))),
                      const SizedBox(height: 16),
                      Card(
                          child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Your rating',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontFamily: 'Poppins')),
                                    const SizedBox(height: 8),
                                    Row(
                                        children: List.generate(
                                            5,
                                            (index) => IconButton(
                                                onPressed: () => setState(
                                                    () => _rating = index + 1),
                                                icon: Icon(
                                                    index < _rating
                                                        ? Icons.star
                                                        : Icons.star_border,
                                                    color: AppColors.gold,
                                                    size: 30)))),
                                    TextField(
                                        controller: _reviewController,
                                        maxLength: 1000,
                                        minLines: 4,
                                        maxLines: 7,
                                        decoration: const InputDecoration(
                                            labelText: 'Your review',
                                            hintText:
                                                'Share your experience with this product',
                                            border: OutlineInputBorder(),
                                            alignLabelWithHint: true)),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed: _submitting ? null : _submit,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 14),
                                        ),
                                        child: _submitting
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child:
                                                    CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  color: Colors.white,
                                                ),
                                              )
                                            : const Text('Submit review'),
                                      ),
                                    ),
                                  ]))),
                    ]),
    );
  }
}

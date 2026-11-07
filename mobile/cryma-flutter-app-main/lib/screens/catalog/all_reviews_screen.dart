import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class AllReviewsScreen extends StatefulWidget {
  const AllReviewsScreen({super.key, this.productId});
  final String? productId;

  @override
  State<AllReviewsScreen> createState() => _AllReviewsScreenState();
}

class _AllReviewsScreenState extends State<AllReviewsScreen> {
  List<Map<String, dynamic>> _reviews = [];
  double _average = 0;
  int _count = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    if (widget.productId == null) {
      setState(() { _error = 'No product was selected.'; _loading = false; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.instance.getProductReviews(widget.productId!);
      if (!mounted) return;
      setState(() {
        _reviews = (data['reviews'] as List? ?? const []).whereType<Map<String, dynamic>>().toList();
        _average = double.tryParse(data['average_rating']?.toString() ?? '') ?? 0;
        _count = int.tryParse(data['review_count']?.toString() ?? '') ?? _reviews.length;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Product Reviews', style: TextStyle(fontFamily: 'Poppins', color: AppColors.primary)), backgroundColor: AppColors.white, foregroundColor: AppColors.primary, elevation: 0),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text(_error!, textAlign: TextAlign.center), const SizedBox(height: 12), OutlinedButton(onPressed: _load, child: const Text('Try again'))])))
                : Column(children: [
                    Card(margin: const EdgeInsets.all(16), child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [Text(_average.toStringAsFixed(1), style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppColors.primary, fontFamily: 'Poppins')), const SizedBox(width: 14), Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: List.generate(5, (i) => Icon(i < _average.round() ? Icons.star : Icons.star_border, color: AppColors.gold, size: 17))), Text('$_count reviews', style: const TextStyle(color: AppColors.gray, fontFamily: 'Poppins'))])]))),
                    Expanded(child: _reviews.isEmpty ? const Center(child: Text('No customer reviews yet.', style: TextStyle(fontFamily: 'Poppins', color: AppColors.gray))) : RefreshIndicator(onRefresh: _load, child: ListView.separated(padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), itemCount: _reviews.length, separatorBuilder: (_, __) => const SizedBox(height: 10), itemBuilder: (context, index) {
                      final review = _reviews[index];
                      final buyer = review['buyer'] as Map<String, dynamic>?;
                      final name = '${buyer?['first_name'] ?? ''} ${buyer?['last_name'] ?? ''}'.trim();
                      final rating = double.tryParse(review['rating']?.toString() ?? '') ?? 0;
                      return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(name.isEmpty ? 'Buyer' : name, style: const TextStyle(fontWeight: FontWeight.w600, fontFamily: 'Poppins'))), ...List.generate(5, (i) => Icon(i < rating.round() ? Icons.star : Icons.star_border, color: AppColors.gold, size: 15))]), const SizedBox(height: 8), Text(review['comment']?.toString() ?? '', style: const TextStyle(color: AppColors.textSecondary, height: 1.45, fontFamily: 'Poppins'))])));
                    }))),
                  ]),
      );
}

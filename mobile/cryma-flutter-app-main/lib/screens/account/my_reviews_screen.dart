import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<MyReviewsScreen> createState() => _MyReviewsScreenState();
}

class _MyReviewsScreenState extends State<MyReviewsScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
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
      final page = await _api.getBuyerOrdersPage(
        status: 'completed',
        sort: 'newest',
      );
      if (!mounted) return;
      setState(() {
        _orders = page.items;
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

  String _fmt(dynamic value) {
    final n = double.tryParse(value?.toString() ?? '') ?? 0;
    final s =
        n == n.roundToDouble() ? n.toInt().toString() : n.toStringAsFixed(2);
    return '₱${s.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 72,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('My Reviews'),
            SizedBox(height: 2),
            Text(
              'Share your experience with completed orders.',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: AppColors.textSubtle,
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.wine,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: AppColors.wine,
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline,
                          size: 42, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontFamily: 'Poppins')),
                      const SizedBox(height: 14),
                      FilledButton(
                          onPressed: _load, child: const Text('Retry')),
                    ]),
                  ),
                )
              : _orders.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child:
                            Column(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.rate_review_outlined,
                              size: 52, color: AppColors.primary),
                          SizedBox(height: 16),
                          Text(
                            'No completed orders yet',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Poppins',
                              color: AppColors.darkGray,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Once you receive and confirm a delivery, you can rate the product here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 13,
                                color: AppColors.gray,
                                height: 1.45),
                          ),
                        ]),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.fromLTRB(16, 14, 16, 6),
                          child: Text(
                            'Tap a completed order to rate and review its products.',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: _load,
                            color: AppColors.primary,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 4),
                              itemCount: _orders.length,
                              itemBuilder: (context, index) {
                                final order = _orders[index];
                                final id = order['id'].toString();
                                final items = (order['items'] as List? ?? [])
                                    .whereType<Map<String, dynamic>>()
                                    .toList();
                                final firstProduct = items.isNotEmpty
                                    ? items.first['product']
                                        as Map<String, dynamic>?
                                    : null;
                                final productName =
                                    firstProduct?['name']?.toString() ??
                                        'Order #$id';
                                final extra = items.length > 1
                                    ? ' +${items.length - 1} more'
                                    : '';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  child: Material(
                                    color: AppColors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(18),
                                      side: const BorderSide(
                                        color: AppColors.borderNeutral,
                                      ),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: InkWell(
                                      onTap: () => Navigator.pushNamed(
                                        context,
                                        '/rate_feedback',
                                        arguments: id,
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 14, vertical: 12),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 48,
                                              height: 48,
                                              decoration: BoxDecoration(
                                                color: AppColors.softRose,
                                                borderRadius:
                                                    BorderRadius.circular(14),
                                              ),
                                              child: const Icon(
                                                Icons.star_outline_rounded,
                                                color: AppColors.primary,
                                                size: 22,
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    '$productName$extra',
                                                    maxLines: 2,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      fontSize: 13,
                                                      fontFamily: 'Poppins',
                                                      color: AppColors.darkGray,
                                                      height: 1.3,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 3),
                                                  Text(
                                                    'Order #$id · ${_fmt(order['total_amount'])}',
                                                    style: const TextStyle(
                                                      fontFamily: 'Poppins',
                                                      fontSize: 11,
                                                      color:
                                                          AppColors.textSubtle,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const Icon(
                                                Icons.chevron_right_rounded,
                                                color: AppColors.gray,
                                                size: 20),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
    );
  }
}

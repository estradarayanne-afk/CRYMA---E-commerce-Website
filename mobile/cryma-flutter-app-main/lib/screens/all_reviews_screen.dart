import 'package:flutter/material.dart';
import '../utils/colors.dart';

class AllReviewsScreen extends StatelessWidget {
  const AllReviewsScreen({super.key, this.productId});

  final String? productId;

  // Sample reviews (hardcoded muna — papalitan ng API later)
  final List<Map<String, dynamic>> _reviews = const [
    {
      'name': 'Maria Santos',
      'rating': 5.0,
      'comment': 'Sobrang ganda ng sound quality! Worth it!',
      'date': '2 weeks ago',
    },
    {
      'name': 'Juan Dela Cruz',
      'rating': 4.0,
      'comment': 'Comfortable siya sa tenga, matagal malowbat.',
      'date': '1 month ago',
    },
    {
      'name': 'Ana Reyes',
      'rating': 5.0,
      'comment': 'Fast shipping, maayos ang packaging!',
      'date': '1 month ago',
    },
    {
      'name': 'Carlo Mendoza',
      'rating': 5.0,
      'comment': 'Excellent noise cancellation! Highly recommended.',
      'date': '1 month ago',
    },
    {
      'name': 'Liza Garcia',
      'rating': 4.0,
      'comment': 'Maganda pero medyo mabigat sa ulo.',
      'date': '2 months ago',
    },
    {
      'name': 'Mark Villanueva',
      'rating': 5.0,
      'comment': 'Sulit! Battery lasts for days.',
      'date': '2 months ago',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 22, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'All Reviews',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),

            // ============================================================
            // RATING SUMMARY
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Text(
                    '4.7',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: List.generate(5, (index) {
                          return const Icon(Icons.star,
                              size: 18, color: AppColors.gold);
                        }),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_reviews.length} reviews',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ============================================================
            // REVIEWS LIST
            // ============================================================
            Expanded(
              child: ListView.builder(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _reviews.length,
                itemBuilder: (context, index) {
                  final review = _reviews[index];
                  return _buildReviewItem(review);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // REVIEW ITEM
  // ============================================================
  Widget _buildReviewItem(Map<String, dynamic> review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar + Name + Rating + Date
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: AppColors.softRose,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    review['name'][0],
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review['name'],
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        ...List.generate(5, (index) {
                          return Icon(
                            index < (review['rating'] as double).floor()
                                ? Icons.star
                                : Icons.star_border,
                            size: 14,
                            color: AppColors.gold,
                          );
                        }),
                        const SizedBox(width: 8),
                        Text(
                          review['date'],
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Comment
          Text(
            review['comment'],
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              fontFamily: 'Poppins',
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

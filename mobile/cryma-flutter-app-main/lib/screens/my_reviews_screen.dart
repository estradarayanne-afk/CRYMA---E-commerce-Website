import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// REVIEW MODEL
// ============================================================
class Review {
  final String id;
  final String productName;
  final String imagePath;
  final double rating;
  final String comment;
  final String date;

  const Review({
    required this.id,
    required this.productName,
    required this.imagePath,
    required this.rating,
    required this.comment,
    required this.date,
  });
}

// ============================================================
// MY REVIEWS SCREEN
// ============================================================
class MyReviewsScreen extends StatelessWidget {
  const MyReviewsScreen({super.key});

  final List<Review> _reviews = const [
    Review(
      id: '1',
      productName: 'Anker Soundcore Q35',
      imagePath: 'assets/image/headphones.jpg',
      rating: 4.7,
      comment: 'Great sound quality! Very comfortable to wear for long hours.',
      date: 'Sep 5, 2026',
    ),
    Review(
      id: '2',
      productName: 'COSRX Snail Mucin',
      imagePath: 'assets/image/cosrx_snail_mucin.jpg',
      rating: 5.0,
      comment: 'Sobrang effective! Nag-improve yung skin ko after 2 weeks.',
      date: 'Aug 28, 2026',
    ),
    Review(
      id: '3',
      productName: 'Havaianas Slim Flip Flops',
      imagePath: 'assets/image/havaianas-slim-flip-flops.jpg',
      rating: 4.5,
      comment: 'Comfortable and stylish. Worth the price!',
      date: 'Aug 15, 2026',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
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
                    'My Reviews',
                    style: TextStyle(
                      fontSize: 18,
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
            // REVIEWS LIST
            // ============================================================
            Expanded(
              child: _reviews.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      itemCount: _reviews.length,
                      itemBuilder: (context, index) {
                        final review = _reviews[index];
                        return _buildReviewCard(review);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // REVIEW CARD
  // ============================================================
  Widget _buildReviewCard(Review review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray, width: 1),
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
          // Product Info Row
          Row(
            children: [
              // Local Image
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: AppColors.lightGray,
                  image: DecorationImage(
                    image: AssetImage(review.imagePath),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.productName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Stars
                    Row(
                      children: [
                        ...List.generate(5, (index) {
                          return Icon(
                            index < review.rating.floor()
                                ? Icons.star
                                : Icons.star_border,
                            size: 14,
                            color: AppColors.gold,
                          );
                        }),
                        const SizedBox(width: 6),
                        Text(
                          review.rating.toString(),
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
          const SizedBox(height: 10),

          // Comment
          Text(
            review.comment,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              fontFamily: 'Poppins',
              height: 1.5,
            ),
          ),
          const SizedBox(height: 10),

          // Date + Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                review.date,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
              ),
              Row(
                children: [
                  // Edit Button
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.primary, width: 1),
                      ),
                      child: const Text(
                        'Edit',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Delete Button
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.danger, width: 1),
                      ),
                      child: const Text(
                        'Delete',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.danger,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.star_outline,
            size: 64,
            color: AppColors.gray.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'No reviews yet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start shopping and share your experience',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.gray,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }
}

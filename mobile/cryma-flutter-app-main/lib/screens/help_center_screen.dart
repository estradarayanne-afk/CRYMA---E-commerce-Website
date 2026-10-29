import 'package:flutter/material.dart';
import '../utils/colors.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  final List<Map<String, String>> _faqs = const [
    {
      'q': 'How do I track my order?',
      'a':
          'Go to My Orders, tap the order you want to track, then tap "Track Order".',
    },
    {
      'q': 'How can I cancel my order?',
      'a':
          'You can cancel your order within 24 hours of placing it. Go to My Orders and select Cancel.',
    },
    {
      'q': 'What payment methods do you accept?',
      'a': 'We accept Cash on Delivery and GCash.',
    },
    {
      'q': 'How long does delivery take?',
      'a':
          'Standard delivery takes 3-5 business days depending on your location.',
    },
    {
      'q': 'Can I return a product?',
      'a':
          'Yes, you can return products within 7 days of delivery if they are defective or not as described.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
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
                    'Help Center',
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

            // FAQs
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Title
                  const Text(
                    'Frequently Asked Questions',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._faqs.map((faq) => _buildFaqItem(faq)).toList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqItem(Map<String, String> faq) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.lightGray, width: 1),
      ),
      child: Theme(
        data: ThemeData().copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: AppColors.primary,
          collapsedIconColor: AppColors.gray,
          title: Text(
            faq['q']!,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                faq['a']!,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins',
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

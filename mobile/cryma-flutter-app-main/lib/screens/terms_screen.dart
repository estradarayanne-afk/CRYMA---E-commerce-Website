import 'package:flutter/material.dart';
import '../utils/colors.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

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
                    'Terms & Conditions',
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
            // CONTENT
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.lightGray, width: 1),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Terms & Conditions',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      SizedBox(height: 12),
                      Text(
                        'Last updated: October 2026\n\n'
                        '1. ACCEPTANCE OF TERMS\n'
                        'By accessing and using CRYMA, you accept and agree to be bound by these Terms & Conditions.\n\n'
                        '2. USER ACCOUNTS\n'
                        'You are responsible for maintaining the confidentiality of your account and password.\n\n'
                        '3. PRODUCTS AND PRICING\n'
                        'All prices are in Philippine Peso (₱) and subject to change without notice.\n\n'
                        '4. ORDERS AND PAYMENT\n'
                        'Orders are subject to availability. We accept Cash on Delivery and GCash.\n\n'
                        '5. SHIPPING AND DELIVERY\n'
                        'Delivery times may vary depending on your location.\n\n'
                        '6. RETURNS AND REFUNDS\n'
                        'Returns are accepted within 7 days of delivery for defective items only.\n\n'
                        '7. PRIVACY\n'
                        'Your privacy is important to us. Please read our Privacy Policy for details.\n\n'
                        '8. CONTACT US\n'
                        'For any questions, contact us at support@cryma.store',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontFamily: 'Poppins',
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

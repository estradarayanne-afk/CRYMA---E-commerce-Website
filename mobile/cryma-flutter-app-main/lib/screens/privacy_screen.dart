import 'package:flutter/material.dart';
import '../utils/colors.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

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
                    'Privacy Policy',
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
                        'Privacy Policy',
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
                        '1. INFORMATION WE COLLECT\n'
                        'We collect your name, email, phone number, and address when you register.\n\n'
                        '2. HOW WE USE YOUR INFORMATION\n'
                        'We use your information to process orders, deliver products, and improve our services.\n\n'
                        '3. DATA PROTECTION\n'
                        'We implement industry-standard security measures to protect your data.\n\n'
                        '4. SHARING OF INFORMATION\n'
                        'We do not sell your personal information to third parties.\n\n'
                        '5. COOKIES\n'
                        'We use cookies to enhance your browsing experience.\n\n'
                        '6. YOUR RIGHTS\n'
                        'You have the right to access, update, or delete your personal information.\n\n'
                        '7. CONTACT\n'
                        'For privacy concerns, email us at privacy@cryma.store',
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

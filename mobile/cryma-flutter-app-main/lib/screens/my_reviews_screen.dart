import 'package:flutter/material.dart';
import '../utils/colors.dart';

class MyReviewsScreen extends StatelessWidget {
  const MyReviewsScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('My Reviews'), backgroundColor: AppColors.white, foregroundColor: AppColors.primary, elevation: 0),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.rate_review_outlined, size: 48, color: AppColors.primary),
              SizedBox(height: 14),
              Text('Your review history is unavailable in the app', textAlign: TextAlign.center, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, fontFamily: 'Poppins', color: AppColors.primary)),
              SizedBox(height: 8),
              Text('You can review products from completed orders. This app does not yet have an API for listing all reviews you have written.', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Poppins', color: AppColors.gray, height: 1.4)),
            ]),
          ),
        ),
      );
}

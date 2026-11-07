import 'package:flutter/material.dart';

/// OrderTrackingScreen redirects to OrderDetailsScreen.
///
/// Delivery tracking data is already shown in OrderDetailsScreen under the
/// "Delivery" section. A separate tracking screen that re-fetches the same
/// order endpoint and duplicates the information was removed to keep the UX
/// consistent with the web app, where a single order detail page shows all
/// tracking events inline.
class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key, this.orderId});
  final String? orderId;

  @override
  Widget build(BuildContext context) {
    // Immediately replace ourselves with the order details screen.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushReplacementNamed(
        context,
        '/order_details',
        arguments: orderId,
      );
    });
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

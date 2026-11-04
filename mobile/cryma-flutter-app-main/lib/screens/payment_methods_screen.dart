import 'package:flutter/material.dart';

import '../utils/colors.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Methods')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.softRose,
                child: Icon(Icons.payments_outlined, color: AppColors.primary),
              ),
              title: Text('Cash on Delivery'),
              subtitle: Text('Available for eligible CRYMA orders.'),
              trailing: Chip(label: Text('Available')),
            ),
          ),
          SizedBox(height: 12),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Payment options are confirmed during checkout. CRYMA currently supports Cash on Delivery.',
              style: TextStyle(color: AppColors.textSecondary, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

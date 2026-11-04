import 'package:flutter/material.dart';

import '../utils/colors.dart';

class PaymentMethodScreen extends StatelessWidget {
  const PaymentMethodScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Method')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.payments_outlined, color: AppColors.primary),
              title: Text('Cash on Delivery'),
              subtitle: Text('Pay when your order is delivered.'),
              trailing: Icon(Icons.check_circle, color: AppColors.success),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: FilledButton(
          onPressed: () => Navigator.pop(context, 'cash_on_delivery'),
          child: const Text('Use Cash on Delivery'),
        ),
      ),
    );
  }
}

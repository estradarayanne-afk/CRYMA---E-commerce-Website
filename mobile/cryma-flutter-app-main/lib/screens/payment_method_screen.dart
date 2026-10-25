import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// PAYMENT METHOD MODEL
// ============================================================
class PaymentMethod {
  final String id;
  final String title;
  final String description;
  final IconData icon;

  const PaymentMethod({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
  });
}

// ============================================================
// PAYMENT METHOD SCREEN
// ============================================================
class PaymentMethodScreen extends StatefulWidget {
  const PaymentMethodScreen({super.key});

  @override
  State<PaymentMethodScreen> createState() => _PaymentMethodScreenState();
}

class _PaymentMethodScreenState extends State<PaymentMethodScreen> {
  String _selectedMethodId = '1';

  // ✅ GCASH AT COD NA LANG
  final List<PaymentMethod> _paymentMethods = const [
    PaymentMethod(
      id: '1',
      title: 'Cash on Delivery',
      description: 'Pay when your order arrives',
      icon: Icons.attach_money,
    ),
    PaymentMethod(
      id: '2',
      title: 'GCash',
      description: 'Pay using your GCash wallet',
      icon: Icons.phone_android,
    ),
  ];

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Payment Method'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _handleConfirm() {
    final method = _paymentMethods.firstWhere((m) => m.id == _selectedMethodId);
    _showAlert('Payment method selected: ${method.title}');
    Navigator.pop(context);
  }

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
                    'Payment Method',
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
            // BODY
            // ============================================================
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Choose how you\'d like to pay for your order.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 16),
                    ..._paymentMethods
                        .map((method) => _buildPaymentCard(method))
                        .toList(),
                  ],
                ),
              ),
            ),

            // ============================================================
            // BOTTOM - Confirm Button
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Confirm Payment Method',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.white,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // PAYMENT CARD - CRIMSON THEME
  // ============================================================
  Widget _buildPaymentCard(PaymentMethod method) {
    final isSelected = _selectedMethodId == method.id;

    return GestureDetector(
      onTap: () => setState(() => _selectedMethodId = method.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.softRose : AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightGray,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon - crimson
            Icon(
              method.icon,
              size: 24,
              color: AppColors.primary,
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    method.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color:
                          isSelected ? AppColors.primary : AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    method.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.7)
                          : AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),
            // Checkmark circle - crimson kapag selected
            if (isSelected)
              Container(
                width: 26,
                height: 26,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  size: 16,
                  color: AppColors.white,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

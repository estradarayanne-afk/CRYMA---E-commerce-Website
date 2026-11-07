import 'package:flutter/material.dart';

import '../utils/colors.dart';

class OrderSuccessScreen extends StatefulWidget {
  const OrderSuccessScreen({super.key});

  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
    );
    _scale = CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut);
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _humanisePayment(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    return raw
        .split('_')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final result = ModalRoute.of(context)?.settings.arguments;
    final order =
        result is Map<String, dynamic> ? result : const <String, dynamic>{};

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: FadeTransition(
              opacity: _fade,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // ── SUCCESS ICON ──────────────────────────────────
                  ScaleTransition(
                    scale: _scale,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color:
                                AppColors.success.withValues(alpha: 0.1),
                          ),
                        ),
                        Container(
                          width: 72,
                          height: 72,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.success,
                          ),
                          child: const Icon(Icons.check_rounded,
                              size: 38, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),

                  // ── TITLE ─────────────────────────────────────────
                  const Text(
                    'Order placed!',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppColors.wine,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "We've received your order. You'll get updates as it's processed.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 14,
                      color: AppColors.gray,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── ORDER SUMMARY CARD ────────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(18),
                      border:
                          Border.all(color: AppColors.borderNeutral),
                    ),
                    child: Column(
                      children: [
                        _row('Order number',
                            '#${order['id'] ?? '—'}'),
                        const Divider(height: 18),
                        _row(
                          'Total amount',
                          order['total_amount'] != null
                              ? '₱${order['total_amount']}'
                              : '—',
                          valueStyle: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        const Divider(height: 18),
                        _row(
                          'Payment',
                          _humanisePayment(
                              order['payment_method']?.toString()),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── ACTIONS ───────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton(
                      onPressed: () => Navigator.pushReplacementNamed(
                          context, '/my_orders'),
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text(
                        'View my orders',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: OutlinedButton(
                      onPressed: () => Navigator.pushReplacementNamed(
                          context, '/home'),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        side: const BorderSide(
                            color: AppColors.borderStrong),
                      ),
                      child: const Text(
                        'Continue shopping',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value, {TextStyle? valueStyle}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 13,
            color: AppColors.gray,
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: valueStyle ??
                const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkGray,
                ),
          ),
        ),
      ],
    );
  }
}

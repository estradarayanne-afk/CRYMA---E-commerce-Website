import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/order_service.dart';
import '../../services/report_service.dart';
import '../../theme.dart';

class AdminDataSheetScreen extends StatefulWidget {
  const AdminDataSheetScreen({super.key});

  @override
  State<AdminDataSheetScreen> createState() => _AdminDataSheetScreenState();
}

class _AdminDataSheetScreenState extends State<AdminDataSheetScreen> {
  int _totalRiders = 0;
  int _ridersWithOrders = 0;
  int _activeDeliveries = 0;
  int _ridersWithWarnings = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final results = await Future.wait([
      AuthService.instance.getTotalRiders(),
      OrderService.instance.countRidersTakingOrders(),
      OrderService.instance.countActiveDeliveries(),
      ReportService.instance.countRidersWithActiveReports(),
    ]);
    if (mounted) {
      setState(() {
        _totalRiders = results[0];
        _ridersWithOrders = results[1];
        _activeDeliveries = results[2];
        _ridersWithWarnings = results[3];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Data Sheet'),
        leading: BackButton(onPressed: () => context.go('/admin')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text('Live Statistics', style: CrymaText.headingMedium),
                  const SizedBox(height: 4),
                  const Text('Pull to refresh for latest data.', style: CrymaText.bodyMedium),
                  const SizedBox(height: 24),
                  _DataCard(
                    label: 'A. Number of Riders',
                    value: '$_totalRiders',
                    description: 'Total active rider accounts registered in the system.',
                    icon: Icons.people_outline,
                    color: CrymaColors.primary,
                  ),
                  const SizedBox(height: 14),
                  _DataCard(
                    label: 'B. Riders Currently Taking Orders',
                    value: '$_ridersWithOrders',
                    description: 'Riders with at least one active non-delivered order assigned.',
                    icon: Icons.delivery_dining_outlined,
                    color: CrymaColors.statusInTransit,
                  ),
                  const SizedBox(height: 14),
                  _DataCard(
                    label: 'C. Items Currently Being Delivered',
                    value: '$_activeDeliveries',
                    description: 'Orders with status "On Transit" or "Out for Delivery".',
                    icon: Icons.local_shipping_outlined,
                    color: CrymaColors.statusOutForDelivery,
                  ),
                  const SizedBox(height: 14),
                  _DataCard(
                    label: 'D. Riders With Warnings / Reports',
                    value: '$_ridersWithWarnings',
                    description: 'Unique riders with at least one active (unresolved) citation.',
                    icon: Icons.warning_amber_outlined,
                    color: CrymaColors.warning,
                    isWarning: true,
                  ),
                ],
              ),
            ),
    );
  }
}

class _DataCard extends StatelessWidget {
  final String label;
  final String value;
  final String description;
  final IconData icon;
  final Color color;
  final bool isWarning;
  const _DataCard({
    required this.label,
    required this.value,
    required this.description,
    required this.icon,
    required this.color,
    this.isWarning = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isWarning ? CrymaColors.warning.withValues(alpha: 0.4) : CrymaColors.divider),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: CrymaColors.textSecondary)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: color, height: 1.1)),
                const SizedBox(height: 6),
                Text(description, style: const TextStyle(fontSize: 12, color: CrymaColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../widgets/loading_indicator.dart';
import '../../widgets/error_widget.dart';
import '../../widgets/stats_card.dart';
import '../../widgets/order_card.dart';
import '../orders/order_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<OrderProvider>().refresh();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        elevation: 0,
      ),
      body: Consumer2<AuthProvider, OrderProvider>(
        builder: (context, authProvider, orderProvider, _) {
          final userName = authProvider.currentUser?.firstName ?? 'User';

          return RefreshIndicator(
            onRefresh: () => orderProvider.refresh(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Container(
                    color: AccentColors.maroon,
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, $userName 👋',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Have a safe delivery today!',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Stats Cards
                  if (orderProvider.isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: LoadingIndicator(),
                    )
                  else if (orderProvider.errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: AppErrorWidget(
                        message: orderProvider.errorMessage!,
                        onRetry: () => orderProvider.refresh(),
                      ),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          StatsCard(
                            value: orderProvider.stats.forPickUp,
                            label: 'For Pick Up',
                            backgroundColor: const Color(0xFFFFDE59),
                            textColor: Colors.black,
                          ),
                          const SizedBox(width: 8),
                          StatsCard(
                            value: orderProvider.stats.active,
                            label: 'Active',
                            backgroundColor: const Color(0xFFE8B4C4),
                          ),
                          const SizedBox(width: 8),
                          StatsCard(
                            value: orderProvider.stats.delivered,
                            label: 'Delivered',
                            backgroundColor: const Color(0xFFA8D8D8),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Active Orders Section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Active Order',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (orderProvider.activeOrder != null)
                    OrderCard(
                      order: orderProvider.activeOrder!,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => OrderDetailScreen(
                              orderId: orderProvider.activeOrder!.id,
                            ),
                          ),
                        );
                      },
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(
                                  Icons.inbox,
                                  size: 48,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No active orders at the moment',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

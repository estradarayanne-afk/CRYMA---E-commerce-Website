import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../utils/colors.dart';

class TrackingEvent {
  final String label;
  final String details;
  final String date;
  final bool isActive;
  final bool isDelivered;

  const TrackingEvent({
    required this.label,
    this.details = '',
    required this.date,
    this.isActive = false,
    this.isDelivered = false,
  });
}

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key, this.orderId});

  final String? orderId;

  final String _courier = 'J&T EXPRESS';
  final String _trackingNumber = '1234567890';
  final String _status = 'Package In Transit';

  final List<TrackingEvent> _events = const [
    TrackingEvent(
      label: 'Package delivered',
      details: 'Received by: JUAN DELA CRUZ\nSan Juan, Metro Manila',
      date: 'Aug 26 · 2:14 PM',
      isActive: true,
      isDelivered: true,
    ),
    TrackingEvent(
      label: 'Out for delivery',
      details: 'Rider: Mario Santos · 0917 888 1234',
      date: 'Aug 26 · 8:05 AM',
      isActive: true,
      isDelivered: false,
    ),
    TrackingEvent(
      label: 'Arrived at sorting hub',
      details: 'Pasig City Hub',
      date: 'Aug 25 · 11:47 PM',
      isActive: true,
      isDelivered: false,
    ),
    TrackingEvent(
      label: 'In transit',
      details: 'Package is on its way\nCebu → Manila',
      date: 'Aug 24 · 6:30 AM',
      isActive: true,
      isDelivered: false,
    ),
    TrackingEvent(
      label: 'Order shipped',
      details: 'Tracking: J&T EXPRESS 1234567890',
      date: 'Aug 23 · 3:00 PM',
      isActive: false,
      isDelivered: false,
    ),
    TrackingEvent(
      label: 'Order placed',
      details: '',
      date: 'Aug 23 · 10:12 AM',
      isActive: false,
      isDelivered: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 20, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Order Tracking',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                      letterSpacing: 1,
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),

            // BODY
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  children: [
                    // COURIER BOX
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const FaIcon(
                            FontAwesomeIcons.truck,
                            size: 18,
                            color: AppColors.white,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$_courier · $_trackingNumber',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.white,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _status,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.white,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // TIMELINE CARD
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        children: _events
                            .map((event) => _buildTimelineItem(event))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // CHAT WITH RIDER BUTTON
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pushNamed(context, '/chat_conversation');
                        },
                        icon: const Icon(Icons.chat_bubble_outline,
                            size: 16, color: AppColors.white),
                        label: const Text(
                          'Chat with Rider',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // TIMELINE ITEM
  // ============================================================
  Widget _buildTimelineItem(TrackingEvent event) {
    final isLast = event == _events.last;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left: Icon/Dot + Line
        SizedBox(
          width: 24,
          child: Column(
            children: [
              if (event.isDelivered)
                const Icon(Icons.check_circle,
                    size: 18, color: AppColors.primary)
              else if (event.isActive)
                Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                )
              else
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.lightGray, width: 2),
                  ),
                ),
              if (!isLast)
                Container(
                  width: 2,
                  height: 40,
                  color: AppColors.lightGray,
                ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        // Right: Label + Details + Date
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight:
                        event.isActive ? FontWeight.w600 : FontWeight.normal,
                    color: event.isActive
                        ? AppColors.primary
                        : AppColors.gray, // ✅ Dark blue green kapag active
                    fontFamily: 'Poppins',
                  ),
                ),
                if (event.details.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    event.details,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 2),
                Text(
                  event.date,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

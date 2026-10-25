import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// NOTIFICATION MODEL
// ============================================================
class NotificationItem {
  final String id;
  final IconData icon;
  final String title;
  final String description;
  final String time;
  bool read;
  final String category;

  NotificationItem({
    required this.id,
    required this.icon,
    required this.title,
    required this.description,
    required this.time,
    this.read = false,
    required this.category,
  });
}

// ============================================================
// NOTIFICATION SCREEN
// ============================================================
class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  String _selectedCategory = 'All';
  final List<String> _categories = ['All', 'Orders', 'Promos', 'Messages', 'Account'];

  final List<NotificationItem> _notifications = [
    NotificationItem(
      id: '1',
      icon: Icons.inbox_outlined,
      title: 'Your order is out for delivery!',
      description: 'Order #CRM-0042 will arrive today by 6 PM.',
      time: '2m ago',
      read: false,
      category: 'Orders',
    ),
    NotificationItem(
      id: '2',
      icon: Icons.local_offer_outlined,
      title: 'New voucher available',
      description: 'Get ₱100 off on orders above ₱500. Use code: CRYMA100',
      time: '1h ago',
      read: false,
      category: 'Promos',
    ),
    NotificationItem(
      id: '3',
      icon: Icons.chat_bubble_outline,
      title: 'New message from TechZone PH',
      description: '"Your package has been shipped!"',
      time: '2h ago',
      read: true,
      category: 'Messages',
    ),
    NotificationItem(
      id: '4',
      icon: Icons.check_circle_outline,
      title: 'Order delivered',
      description: 'Order #CRM-0039 has been delivered. Please rate your purchase.',
      time: 'Yesterday',
      read: true,
      category: 'Orders',
    ),
    NotificationItem(
      id: '5',
      icon: Icons.flash_on_outlined,
      title: 'Flash Sale starts in 1 hour!',
      description: 'Up to 50% off on selected items. Don\'t miss out!',
      time: 'Yesterday',
      read: true,
      category: 'Promos',
    ),
    NotificationItem(
      id: '6',
      icon: Icons.lock_outline,
      title: 'Login from new device',
      description: 'A new sign-in was detected on your account.',
      time: '2 days ago',
      read: true,
      category: 'Account',
    ),
  ];

  void _markAllAsRead() {
    setState(() {
      for (var item in _notifications) {
        item.read = true;
      }
    });
  }

  void _markAsRead(String id) {
    setState(() {
      final index = _notifications.indexWhere((item) => item.id == id);
      if (index != -1) {
        _notifications[index].read = true;
      }
    });
  }

  List<NotificationItem> get _filteredNotifications {
    if (_selectedCategory == 'All') {
      return _notifications;
    }
    return _notifications.where((item) => item.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredNotifications;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  GestureDetector(
                    onTap: _markAllAsRead,
                    child: const Text(
                      'Mark all read',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ============================================================
            // CATEGORY TABS
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _categories.map((category) => _buildCategoryTab(category)).toList(),
                ),
              ),
            ),

            // ============================================================
            // TAB DIVIDER
            // ============================================================
            Container(
              height: 1,
              color: AppColors.lightGray,
            ),

            // ============================================================
            // NOTIFICATIONS LIST
            // ============================================================
            Expanded(
              child: filtered.isEmpty
                  ? _buildEmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      itemCount: filtered.length,
                      separatorBuilder: (context, index) =>
                          const Divider(color: Color(0xFFF0F0F0), height: 2),
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        return _buildNotificationCard(item);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // CATEGORY TAB
  // ============================================================
  Widget _buildCategoryTab(String category) {
    final isSelected = _selectedCategory == category;

    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = category),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFD1D5DB),
            width: 1,
          ),
        ),
        child: Text(
          category,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isSelected ? AppColors.white : const Color(0xFF6B7280),
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }

  // ============================================================
  // NOTIFICATION CARD
  // ============================================================
  Widget _buildNotificationCard(NotificationItem item) {
    return GestureDetector(
      onTap: () => _markAsRead(item.id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
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
            // Icon Container
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F3F2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                item.icon,
                size: 22,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                      fontFamily: 'Poppins',
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.time,
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF9CA3AF),
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),
            // Unread Dot
            if (!item.read)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_off_outlined,
            size: 50,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 12),
          const Text(
            'No notifications',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF9CA3AF),
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }
}
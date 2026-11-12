import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;
  bool _loading = true;
  bool _markingAllRead = false;
  String? _error;

  String _formatDate(String? raw) {
    if (raw == null) return '';
    try {
      return DateFormat('MMM d, yyyy · h:mm a')
          .format(DateTime.parse(raw).toLocal());
    } catch (_) {
      return raw;
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _api.getBuyerNotifications();
      if (!mounted) return;
      setState(() {
        _notifications =
            response['notifications'] as List<Map<String, dynamic>>;
        _unreadCount = response['unread_count'] as int;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    if (_markingAllRead || _unreadCount == 0) return;
    setState(() => _markingAllRead = true);
    try {
      await _api.markAllBuyerNotificationsRead();
      if (!mounted) return;
      setState(() {
        _notifications = _notifications
            .map((item) => {
                  ...item,
                  'read_at':
                      item['read_at'] ?? DateTime.now().toIso8601String(),
                })
            .toList();
        _unreadCount = 0;
      });
    } catch (error) {
      if (mounted) _showError(error.toString());
    } finally {
      if (mounted) setState(() => _markingAllRead = false);
    }
  }

  Future<void> _openNotification(Map<String, dynamic> notification) async {
    final id = notification['id']?.toString();
    final data = notification['data'] is Map<String, dynamic>
        ? notification['data'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final orderId = data['order_id']?.toString();
    if (orderId == null || orderId.isEmpty) {
      _showError('This delivery update is missing its order link.');
      return;
    }

    if (notification['read_at'] == null && id != null) {
      try {
        await _api.markBuyerNotificationRead(id);
        if (!mounted) return;
        setState(() {
          final index = _notifications
              .indexWhere((item) => item['id'] == notification['id']);
          if (index >= 0) {
            _notifications[index] = {
              ..._notifications[index],
              'read_at': DateTime.now().toIso8601String(),
            };
            if (_unreadCount > 0) _unreadCount--;
          }
        });
      } catch (error) {
        _showError(error.toString());
        return;
      }
    }

    if (mounted) {
      Navigator.pushNamed(context, '/order_details', arguments: orderId);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 72,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Delivery updates'),
            SizedBox(height: 2),
            Text(
              'Important milestones for your parcels.',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: AppColors.textSubtle,
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.wine,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: AppColors.wine,
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markingAllRead ? null : _markAllRead,
              child: _markingAllRead
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Read all'),
            ),
          IconButton(
            tooltip: 'Refresh updates',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 42, color: AppColors.danger),
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 14),
                        FilledButton(
                            onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _notifications.isEmpty
                  ? RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 170),
                          Icon(Icons.notifications_none_rounded,
                              size: 48, color: AppColors.gray),
                          SizedBox(height: 14),
                          Center(
                            child: Text(
                              'No delivery updates yet.',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          final notification = _notifications[index];
                          final data =
                              notification['data'] is Map<String, dynamic>
                                  ? notification['data'] as Map<String, dynamic>
                                  : const <String, dynamic>{};
                          final orderId = data['order_id']?.toString() ?? '';
                          final isUnread = notification['read_at'] == null;
                          final createdAt = _formatDate(
                              notification['created_at']?.toString());

                          return Card(
                            color: isUnread
                                ? const Color(0xFFFFF8FA)
                                : AppColors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                              side: const BorderSide(
                                  color: AppColors.borderNeutral),
                            ),
                            margin: const EdgeInsets.only(bottom: 11),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: () => _openNotification(notification),
                              child: Padding(
                                padding: const EdgeInsets.all(15),
                                child: Row(
                                  children: [
                                    const CircleAvatar(
                                      backgroundColor: AppColors.softRose,
                                      child: Icon(
                                        Icons.local_shipping_rounded,
                                        color: AppColors.primary,
                                        size: 21,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            data['title']?.toString() ??
                                                'Delivery update',
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.darkGray,
                                              fontFamily: 'Poppins',
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            data['body']?.toString() ?? '',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.textSecondary,
                                              fontFamily: 'Poppins',
                                            ),
                                          ),
                                          const SizedBox(height: 5),
                                          Text(
                                            'Order #$orderId${createdAt.isEmpty ? '' : ' · $createdAt'}',
                                            style: const TextStyle(
                                              fontSize: 10,
                                              color: AppColors.gray,
                                              fontFamily: 'Poppins',
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (isUnread)
                                      Container(
                                        width: 8,
                                        height: 8,
                                        margin: const EdgeInsets.only(left: 8),
                                        decoration: const BoxDecoration(
                                          color: AppColors.primary,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    const Icon(Icons.chevron_right,
                                        color: AppColors.gray, size: 18),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 1,
        onDestinationSelected: (i) =>
            BuyerBottomNavigationBar.navigateToTab(context, i, 1),
      ),
    );
  }
}

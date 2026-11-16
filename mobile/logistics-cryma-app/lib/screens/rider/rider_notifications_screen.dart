import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../models/courier_app_notification.dart';
import '../../services/api_client.dart';
import '../../services/courier_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderNotificationsScreen extends StatefulWidget {
  const RiderNotificationsScreen({super.key});

  @override
  State<RiderNotificationsScreen> createState() =>
      _RiderNotificationsScreenState();
}

class _RiderNotificationsScreenState extends State<RiderNotificationsScreen> {
  List<CourierAppNotification> _notifications = [];
  bool _loading = true;
  bool _updating = false;
  String? _error;

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
      final notifications = await CourierService.instance.getNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = notifications;
        _loading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _updating = true);
    try {
      await CourierService.instance.markAllNotificationsRead();
      await _load();
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _open(CourierAppNotification notification) async {
    if (!notification.isRead) {
      try {
        await CourierService.instance.markNotificationRead(notification.id);
      } on ApiException catch (error) {
        if (mounted) _showError(error.message);
        return;
      }
    }
    if (!mounted) return;
    context.go(
      '/rider/parcels/${notification.taskType == 'pickup' ? 'pickups' : 'deliveries'}/${notification.taskId}',
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((item) => !item.isRead).length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: unreadCount == 0 || _updating ? null : _markAllRead,
            child: _updating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Mark all read'),
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
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: _load,
                          child: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                )
              : _notifications.isEmpty
                  ? const EmptyState(
                      icon: Icons.notifications_none_outlined,
                      title: 'No notifications',
                      subtitle:
                          'New pickup and delivery assignments will appear here.',
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _notifications.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final notification = _notifications[index];
                          return Card(
                            margin: EdgeInsets.zero,
                            color: notification.isRead
                                ? null
                                : CrymaColors.veryLightPink,
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: CrymaColors.palePink,
                                child: Icon(
                                  notification.taskType == 'pickup'
                                      ? Icons.storefront_outlined
                                      : Icons.local_shipping_outlined,
                                  color: CrymaColors.primary,
                                ),
                              ),
                              title: Text(
                                notification.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(notification.message),
                                  if (notification.createdAt != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      DateFormat('MMM d, yyyy · h:mm a').format(
                                          notification.createdAt!.toLocal()),
                                      style: CrymaText.caption,
                                    ),
                                  ],
                                ],
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => _open(notification),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

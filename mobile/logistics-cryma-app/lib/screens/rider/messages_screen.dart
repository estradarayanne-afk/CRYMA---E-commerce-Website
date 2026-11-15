import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderMessagesScreen extends StatefulWidget {
  const RiderMessagesScreen({super.key});

  @override
  State<RiderMessagesScreen> createState() => _RiderMessagesScreenState();
}

class _RiderMessagesScreenState extends State<RiderMessagesScreen> {
  static const _navItems = [
    BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: 'Orders'),
    BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Messages'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
  ];
  static const _navRoutes = ['/rider', '/rider/deliveries', '/rider/messages', '/rider/profile'];

  StreamSubscription<List<ConversationModel>>? _sub;
  List<ConversationModel> _convos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startStream());
  }

  void _startStream() {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    _sub = ChatService.instance.watchConversations(riderId).listen((convos) {
      if (mounted) setState(() { _convos = convos; _loading = false; });
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  String _formatTime(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
        final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
        final m = dt.minute.toString().padLeft(2, '0');
        final ampm = dt.hour >= 12 ? 'PM' : 'AM';
        return '$h:$m $ampm';
      }
      return '${dt.month}/${dt.day}';
    } catch (_) {
      return '';
    }
  }

  IconData _iconFor(ConversationType type) => switch (type) {
        ConversationType.logistics => Icons.business_outlined,
        ConversationType.seller => Icons.storefront_outlined,
        ConversationType.buyer => Icons.person_outline,
        ConversationType.warning => Icons.warning_amber_rounded,
      };

  Color _colorFor(ConversationType type) => switch (type) {
        ConversationType.warning => CrymaColors.primary,
        _ => CrymaColors.primary,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _convos.isEmpty
              ? const EmptyState(
                  icon: Icons.chat_bubble_outline,
                  title: 'No conversations yet',
                  subtitle: 'Your messages will appear here.',
                )
              : ListView.separated(
                  itemCount: _convos.length,
                  separatorBuilder: (_, __) => const Divider(indent: 72, height: 1),
                  itemBuilder: (_, i) {
                    final c = _convos[i];
                    final hasUnread = c.unreadCount > 0;
                    final icon = _iconFor(c.conversationType);
                    final color = _colorFor(c.conversationType);
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      leading: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: CrymaColors.palePink,
                            child: Icon(icon, color: color, size: 20),
                          ),
                          if (hasUnread)
                            Positioned(
                              top: -2,
                              right: -2,
                              child: Container(
                                width: 18,
                                height: 18,
                                decoration: const BoxDecoration(
                                  color: CrymaColors.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    c.unreadCount > 9 ? '9+' : '${c.unreadCount}',
                                    style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      title: Text(
                        c.title,
                        style: TextStyle(
                          fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 14,
                          color: CrymaColors.textPrimary,
                        ),
                      ),
                      subtitle: Text(
                        c.lastMessage ?? 'No messages yet',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          color: hasUnread ? CrymaColors.textPrimary : CrymaColors.textSecondary,
                          fontWeight: hasUnread ? FontWeight.w500 : FontWeight.w400,
                        ),
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(_formatTime(c.lastMessageTime), style: CrymaText.caption),
                          if (c.conversationType != ConversationType.warning) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: CrymaColors.palePink,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                c.conversationType.label,
                                style: const TextStyle(fontSize: 10, color: CrymaColors.primary, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ],
                      ),
                      onTap: () => context.go('/rider/messages/${c.id}'),
                    );
                  },
                ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 2,
        items: _navItems,
        routes: _navRoutes,
        onNavigate: context.go,
      ),
    );
  }
}

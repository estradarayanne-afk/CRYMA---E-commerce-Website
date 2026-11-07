import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final conversations = await ApiService.instance.getBuyerChatConversations();
      if (!mounted) return;
      // Deduplicate: keep at most one CRYMA Support conversation
      // (the one with no seller_id). Multiple support threads can accumulate;
      // show only the most recent one so the list isn't cluttered.
      final seen = <String>{};
      final deduped = <Map<String, dynamic>>[];
      for (final conv in conversations) {
        final isSupportConv = conv['seller'] == null;
        if (isSupportConv) {
          if (seen.contains('support')) continue;
          seen.add('support');
        }
        deduped.add(conv);
      }
      setState(() { _conversations = deduped; _loading = false; });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  String _title(Map<String, dynamic> conversation) {
    final seller = conversation['seller'] as Map<String, dynamic>?;
    final profile = seller?['seller_profile'] as Map<String, dynamic>?;
    final business = profile?['business_name']?.toString().trim();
    if (business != null && business.isNotEmpty) return business;
    if (seller != null) {
      final name = '${seller['first_name'] ?? ''} ${seller['last_name'] ?? ''}'.trim();
      if (name.isNotEmpty) return name;
    }
    return 'CRYMA Support';
  }

  String _preview(Map<String, dynamic> conversation) {
    final messages = conversation['messages'];
    if (messages is List && messages.isNotEmpty && messages.last is Map<String, dynamic>) {
      return (messages.last as Map<String, dynamic>)['message']?.toString() ?? 'No messages yet';
    }
    return 'No messages yet';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Messages', style: TextStyle(fontFamily: 'Poppins', color: AppColors.primary, fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _StateMessage(message: _error!, onRetry: _load)
              : _conversations.isEmpty
                  ? const Center(child: Text('Your conversations will appear here.', style: TextStyle(fontFamily: 'Poppins', color: AppColors.gray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _conversations.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final conversation = _conversations[index];
                          final unread = int.tryParse(conversation['unread_messages_count']?.toString() ?? '') ?? 0;
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(vertical: 4),
                            leading: const CircleAvatar(backgroundColor: AppColors.softRose, child: Icon(Icons.storefront_outlined, color: AppColors.primary)),
                            title: Text(_title(conversation), style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: AppColors.darkGray)),
                            subtitle: Text(_preview(conversation), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Poppins', color: AppColors.gray)),
                            trailing: unread > 0 ? CircleAvatar(radius: 12, backgroundColor: AppColors.primary, child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11))) : const Icon(Icons.chevron_right, color: AppColors.gray),
                            onTap: () => Navigator.pushNamed(context, '/chat_conversation', arguments: conversation['id'].toString()).then((_) => _load()),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _StateMessage extends StatelessWidget {
  const _StateMessage({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'Poppins', color: AppColors.gray)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ]),
        ),
      );
}

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

/// Customer Support — opens the buyer's support conversation directly.
///
/// The web app routes /buyer/support to the buyer chat page with
/// supportOnly:true. On mobile, we look up the support conversation
/// (seller_id IS NULL) from the conversation list and open it directly,
/// or start a new one if it doesn't exist yet.
class CustomerServiceScreen extends StatefulWidget {
  const CustomerServiceScreen({super.key});

  @override
  State<CustomerServiceScreen> createState() => _CustomerServiceScreenState();
}

class _CustomerServiceScreenState extends State<CustomerServiceScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _openSupportChat() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Find the existing support conversation (no seller_id) or let the
      // chat list show it — same as the web's /buyer/support route.
      final conversations =
          await ApiService.instance.getBuyerChatConversations();
      // Support conversations have seller == null.
      final support = conversations.cast<Map<String, dynamic>?>().firstWhere(
            (c) => c?['seller'] == null,
            orElse: () => null,
          );
      if (!mounted) return;
      if (support != null) {
        Navigator.pushNamed(
          context,
          '/chat_conversation',
          arguments: support['id'].toString(),
        );
      } else {
        // No support conversation yet — navigate to the chat list so the user
        // can initiate one via the refund request or order flow.
        Navigator.pushNamed(context, '/chat_list');
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Customer Support'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          // Hero banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            decoration: BoxDecoration(
              color: AppColors.softRose,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(children: [
              Icon(Icons.support_agent, size: 48, color: AppColors.primary),
              SizedBox(height: 10),
              Text(
                'How can we help?',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Send us a message and our team will get back to you.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins',
                  height: 1.45,
                ),
              ),
            ]),
          ),
          const SizedBox(height: 18),

          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFEFB8C0)),
              ),
              child: Text(
                _error!,
                style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 13,
                    fontFamily: 'Poppins'),
              ),
            ),

          // Open support chat
          Card(
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              leading: const CircleAvatar(
                backgroundColor: AppColors.softRose,
                child: Icon(Icons.chat_bubble_outline, color: AppColors.primary),
              ),
              title: const Text(
                'In-app support chat',
                style: TextStyle(
                    fontFamily: 'Poppins', fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'Messages are sent directly to CRYMA support.',
                style:
                    TextStyle(fontFamily: 'Poppins', color: AppColors.gray),
              ),
              trailing: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right),
              onTap: _loading ? null : _openSupportChat,
            ),
          ),
          const SizedBox(height: 12),

          // All conversations
          Card(
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              leading: const CircleAvatar(
                backgroundColor: AppColors.softRose,
                child: Icon(Icons.forum_outlined, color: AppColors.primary),
              ),
              title: const Text(
                'All messages',
                style: TextStyle(
                    fontFamily: 'Poppins', fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'View conversations with sellers and support.',
                style:
                    TextStyle(fontFamily: 'Poppins', color: AppColors.gray),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pushNamed(context, '/chat_list'),
            ),
          ),
        ],
      ),
    );
  }
}

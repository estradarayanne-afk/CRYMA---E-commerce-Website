import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

/// Customer Support — immediately opens the CRYMA support conversation.
/// Shows a loading screen while finding the conversation, then redirects
/// directly to the chat. No intermediate page shown.
class CustomerServiceScreen extends StatefulWidget {
  const CustomerServiceScreen({super.key});

  @override
  State<CustomerServiceScreen> createState() => _CustomerServiceScreenState();
}

class _CustomerServiceScreenState extends State<CustomerServiceScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    // Immediately open the support conversation on mount.
    WidgetsBinding.instance.addPostFrameCallback((_) => _openSupportChat());
  }

  Future<void> _openSupportChat() async {
    if (!mounted) return;
    setState(() => _error = null);
    try {
      final conversations =
          await ApiService.instance.getBuyerChatConversations();
      // Support conversation = no seller_id.
      final support = conversations.cast<Map<String, dynamic>?>().firstWhere(
            (c) => c?['seller'] == null,
            orElse: () => null,
          );
      if (!mounted) return;
      if (support != null) {
        // Replace this screen with the conversation directly.
        Navigator.pushReplacementNamed(
          context,
          '/chat_conversation',
          arguments: support['id'].toString(),
        );
      } else {
        // No support conversation yet — fall back to the chat list.
        Navigator.pushReplacementNamed(context, '/chat_list');
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    // Error state — shown only when the API call fails.
    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Customer Support'),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.primary,
          elevation: 0,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded,
                  size: 42, color: AppColors.danger),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontFamily: 'Poppins'),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _openSupportChat,
                child: const Text('Retry'),
              ),
            ]),
          ),
        ),
      );
    }

    // Loading state — shown while the conversation is being fetched.
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

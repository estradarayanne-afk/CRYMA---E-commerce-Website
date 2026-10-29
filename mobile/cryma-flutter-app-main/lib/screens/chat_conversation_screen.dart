import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// MESSAGE MODEL
// ============================================================
class Message {
  final String id;
  final String text;
  final String time;
  final bool isMine;

  Message({
    required this.id,
    required this.text,
    required this.time,
    this.isMine = false,
  });
}

// ============================================================
// CHAT CONVERSATION SCREEN
// ============================================================
class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({super.key, this.chatId});

  final String? chatId;

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Message> _messages = [
    Message(
      id: '1',
      text:
          'Hello! Thank you for your order 😊 Your package has been handed to J&T Express.',
      time: '2:01 PM',
      isMine: false,
    ),
    Message(
      id: '2',
      text: 'Thank you! Can I get the tracking number?',
      time: '2:03 PM',
      isMine: true,
    ),
    Message(
      id: '3',
      text:
          'Of course! Tracking number: JT1234567890. You can track it at J&T website.',
      time: '2:04 PM',
      isMine: false,
    ),
    Message(
      id: '4',
      text: 'Perfect, thank you so much! 👍',
      time: '2:05 PM',
      isMine: true,
    ),
    Message(
      id: '5',
      text:
          "You're welcome! Please leave a review once you receive it. Have a great day! 😊",
      time: '2:06 PM',
      isMine: false,
    ),
  ];

  void _sendMessage() {
    if (_messageController.text.trim().isNotEmpty) {
      setState(() {
        _messages.add(
          Message(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            text: _messageController.text.trim(),
            time: _formatTime(DateTime.now()),
            isMine: true,
          ),
        );
        _messageController.clear();
      });
      _scrollToBottom();
    }
  }

  String _formatTime(DateTime time) {
    return '${time.hour}:${time.minute.toString().padLeft(2, '0')} ${time.hour >= 12 ? 'PM' : 'AM'}';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 24, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                  ),
                  // ✅ LOCAL AVATAR - AssetImage
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.lightGray,
                      image: DecorationImage(
                        image: AssetImage('assets/image/techzoneph.jpg'),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Seller Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'TechZone PH',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF00B894),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Online',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.gray,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Call Button
                  IconButton(
                    icon: const Icon(Icons.call_outlined,
                        size: 22, color: AppColors.primary),
                    onPressed: () {},
                  ),
                ],
              ),
            ),

            // ============================================================
            // MESSAGES LIST
            // ============================================================
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  return _buildMessage(message);
                },
              ),
            ),

            // ============================================================
            // INPUT
            // ============================================================
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.darkGray,
                                fontFamily: 'Poppins',
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Type a message...',
                                hintStyle: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.gray,
                                  fontFamily: 'Poppins',
                                ),
                                border: InputBorder.none,
                                contentPadding:
                                    EdgeInsets.symmetric(vertical: 8),
                              ),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.image_outlined,
                                size: 22, color: AppColors.gray),
                            onPressed: () {},
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: _sendMessage,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.send_outlined,
                        size: 20,
                        color: AppColors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // MESSAGE BUBBLE
  // ============================================================
  Widget _buildMessage(Message message) {
    final isMine = message.isMine;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment:
            isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.8,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isMine ? AppColors.primary : AppColors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(isMine ? 16 : 4),
                topRight: Radius.circular(isMine ? 4 : 16),
                bottomLeft: const Radius.circular(16),
                bottomRight: const Radius.circular(16),
              ),
              boxShadow: isMine
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
            ),
            child: Text(
              message.text,
              style: TextStyle(
                fontSize: 14,
                color: isMine ? AppColors.white : AppColors.darkGray,
                fontFamily: 'Poppins',
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              message.time,
              style: const TextStyle(
                fontSize: 10,
                color: AppColors.gray,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

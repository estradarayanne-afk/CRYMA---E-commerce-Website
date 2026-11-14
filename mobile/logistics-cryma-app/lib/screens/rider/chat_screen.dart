import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';
import '../../theme.dart';

class RiderChatScreen extends StatefulWidget {
  final int conversationId;
  const RiderChatScreen({super.key, required this.conversationId});

  @override
  State<RiderChatScreen> createState() => _RiderChatScreenState();
}

class _RiderChatScreenState extends State<RiderChatScreen> {
  final _replyCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  StreamSubscription<List<MessageModel>>? _sub;
  List<MessageModel> _messages = [];
  ConversationModel? _convo;
  bool _loading = true;
  bool _sending = false;
  int _prevCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;

    // Load conversation metadata once
    final convos = await ChatService.instance.getConversationsForRider(riderId);
    if (mounted) {
      setState(() => _convo = convos.where((c) => c.id == widget.conversationId).firstOrNull);
    }

    // Mark existing messages read
    await ChatService.instance.markConversationRead(widget.conversationId, riderId);

    // Start live stream
    _sub = ChatService.instance
        .watchMessages(widget.conversationId)
        .listen((msgs) async {
      if (!mounted) return;
      final isNew = msgs.length > _prevCount;
      _prevCount = msgs.length;
      setState(() { _messages = msgs; _loading = false; });
      if (isNew) {
        // Mark new messages read and scroll down
        await ChatService.instance.markConversationRead(widget.conversationId, riderId);
        _scrollToBottom();
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _replyCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;
    final auth = context.read<AuthProvider>();
    setState(() => _sending = true);
    _replyCtrl.clear();
    await ChatService.instance.sendMessage(
      conversationId: widget.conversationId,
      senderId: auth.userId,
      senderName: auth.userName,
      body: text,
    );
    setState(() => _sending = false);
    _scrollToBottom();
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final m = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      return '$h:$m $ampm';
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

  @override
  Widget build(BuildContext context) {
    final myId = context.read<AuthProvider>().userId;
    final type = _convo?.conversationType ?? ConversationType.logistics;
    final isWarning = type == ConversationType.warning;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(_iconFor(type), size: 18, color: CrymaColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _convo?.title ?? 'Chat',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        leading: BackButton(onPressed: () => context.go('/rider/messages')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (isWarning)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    color: CrymaColors.palePink,
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 16, color: CrymaColors.primary),
                        const SizedBox(width: 8),
                        Text(
                          'From: $kSuperUserDisplayName',
                          style: const TextStyle(fontSize: 13, color: CrymaColors.primary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: _messages.isEmpty
                      ? const Center(
                          child: Text('No messages yet.', style: TextStyle(color: CrymaColors.textSecondary)),
                        )
                      : ListView.builder(
                          controller: _scrollCtrl,
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                          itemCount: _messages.length,
                          itemBuilder: (_, i) {
                            final msg = _messages[i];
                            final isMe = msg.senderId == myId;
                            final isWarnMsg = msg.messageType == MessageType.warningNotice;
                            return _MessageBubble(
                              message: msg,
                              isMe: isMe,
                              isWarning: isWarnMsg,
                              time: _formatTime(msg.createdAt),
                            );
                          },
                        ),
                ),
                Container(
                  padding: EdgeInsets.fromLTRB(
                    12, 8, 12,
                    MediaQuery.of(context).viewInsets.bottom + 12,
                  ),
                  decoration: const BoxDecoration(
                    color: CrymaColors.surface,
                    border: Border(top: BorderSide(color: CrymaColors.divider)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _replyCtrl,
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: const BorderSide(color: CrymaColors.divider),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: const BorderSide(color: CrymaColors.divider),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: const BorderSide(color: CrymaColors.primary),
                            ),
                          ),
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _sending
                          ? const SizedBox(
                              width: 44, height: 44,
                              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : IconButton.filled(
                              onPressed: _send,
                              icon: const Icon(Icons.send_rounded),
                              style: IconButton.styleFrom(
                                backgroundColor: CrymaColors.primary,
                                foregroundColor: Colors.white,
                              ),
                            ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;
  final bool isWarning;
  final String time;
  const _MessageBubble({
    required this.message,
    required this.isMe,
    required this.isWarning,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    if (isWarning) {
      return Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: CrymaColors.palePink,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: CrymaColors.primary.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, size: 16, color: CrymaColors.primary),
                const SizedBox(width: 6),
                const Text('WARNING NOTICE',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: CrymaColors.primary, letterSpacing: 0.5)),
                const Spacer(),
                Text(time, style: const TextStyle(fontSize: 11, color: CrymaColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 4),
            Text('From: ${message.senderName}',
                style: const TextStyle(fontSize: 12, color: CrymaColors.textSecondary)),
            const SizedBox(height: 8),
            Text(message.body, style: const TextStyle(fontSize: 14, color: CrymaColors.textPrimary)),
          ],
        ),
      );
    }

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? CrymaColors.primary : CrymaColors.inputFill,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(message.senderName,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: CrymaColors.primary)),
              ),
            Text(message.body,
                style: TextStyle(fontSize: 14, color: isMe ? Colors.white : CrymaColors.textPrimary)),
            const SizedBox(height: 4),
            Text(time,
                style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : CrymaColors.textHint)),
          ],
        ),
      ),
    );
  }
}

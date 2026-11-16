import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/rider_chat_service.dart';
import '../../theme.dart';

class RiderDeliveryChatScreen extends StatefulWidget {
  const RiderDeliveryChatScreen({
    super.key,
    required this.orderId,
    this.chatService,
  });

  final int orderId;
  final RiderChatService? chatService;

  @override
  State<RiderDeliveryChatScreen> createState() =>
      _RiderDeliveryChatScreenState();
}

class _RiderDeliveryChatScreenState extends State<RiderDeliveryChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  late final RiderChatService _chatService;
  Timer? _pollTimer;
  RiderDeliveryChat? _chat;
  List<RiderChatMessage> _messages = [];
  bool _loading = true;
  bool _busy = false;
  bool _sending = false;
  bool _chatUnavailable = false;
  String? _error;
  String? _pendingMessage;
  String? _pendingMessageId;

  @override
  void initState() {
    super.initState();
    _chatService = widget.chatService ?? RiderChatService.instance;
    _load();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 8),
      (_) => _load(showLoading: false),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load({bool showLoading = true}) async {
    if (_busy) return;
    _busy = true;
    if (showLoading && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      var chat = _chat;
      if (chat == null) {
        final chats = await _chatService.getDeliveryChats();
        chat = chats
            .where((item) =>
                item.type == 'buyer_rider' && item.orderId == widget.orderId)
            .firstOrNull;
        if (chat == null) {
          if (mounted) {
            setState(() {
              _chatUnavailable = true;
              _loading = false;
              _error = null;
            });
          }
          return;
        }
      }

      final messages = await _chatService.getMessages(chat.id);
      if (!mounted) return;
      final hadNewMessages = messages.length > _messages.length;
      setState(() {
        _chat = chat;
        _messages = messages;
        _chatUnavailable = false;
        _loading = false;
        _error = null;
      });
      if (hadNewMessages) _scrollToBottom();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _chatUnavailable = false;
          _error = error.message;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      } else {
        _busy = false;
      }
    }
  }

  Future<void> _send() async {
    final text = _messageController.text.trim();
    if (_sending || text.isEmpty || text.length > 2000) return;
    final chat = _chat;
    if (chat == null) return;

    if (_pendingMessage != text) {
      _pendingMessage = text;
      _pendingMessageId = _newClientMessageId();
    }

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await _chatService.sendMessage(
        conversationId: chat.id,
        message: text,
        clientMessageId: _pendingMessageId!,
      );
      if (!mounted) return;
      _messageController.clear();
      _pendingMessage = null;
      _pendingMessageId = null;
      await _load(showLoading: false);
      _scrollToBottom();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _newClientMessageId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0'));
    final value = hex.join();
    return '${value.substring(0, 8)}-${value.substring(8, 12)}-'
        '${value.substring(12, 16)}-${value.substring(16, 20)}-'
        '${value.substring(20)}';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _formatTime(DateTime value) =>
      DateFormat('MMM d, h:mm a').format(value.toLocal());

  @override
  Widget build(BuildContext context) {
    final chat = _chat;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          chat == null ? 'Chat with buyer' : 'Chat with ${chat.buyerName}',
        ),
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/rider/parcels');
            }
          },
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh messages',
            onPressed: _busy ? null : () => _load(showLoading: false),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _chatUnavailable
              ? _UnavailableState(onRetry: () => _load(showLoading: true))
              : chat == null
                  ? _ErrorState(
                      message: _error ?? 'Could not load this chat.',
                      onRetry: () => _load(showLoading: true),
                    )
                  : Column(
                      children: [
                        if (_error != null)
                          _ErrorBanner(
                            message: _error!,
                            onRetry: _sending
                                ? null
                                : () => _load(showLoading: false),
                          ),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: () => _load(showLoading: false),
                            child: _messages.isEmpty
                                ? ListView(
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    children: const [
                                      SizedBox(height: 180),
                                      Center(child: Text('No messages yet.')),
                                    ],
                                  )
                                : ListView.builder(
                                    controller: _scrollController,
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    padding: const EdgeInsets.all(16),
                                    itemCount: _messages.length,
                                    itemBuilder: (context, index) {
                                      final message = _messages[index];
                                      return _MessageBubble(
                                        message: message,
                                        isMine: message.senderId != null &&
                                            message.senderId ==
                                                _currentUserId(context),
                                        time: _formatTime(message.createdAt),
                                      );
                                    },
                                  ),
                          ),
                        ),
                        _Composer(
                          controller: _messageController,
                          sending: _sending,
                          onSend: _send,
                          onRetry: _pendingMessage == null ? null : _send,
                          error: _error,
                        ),
                      ],
                    ),
    );
  }

  int? _currentUserId(BuildContext context) {
    return context.read<AuthProvider>().userId;
  }
}

class _UnavailableState extends StatelessWidget {
  const _UnavailableState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.chat_bubble_outline, size: 40),
              const SizedBox(height: 12),
              const Text(
                'This chat is not available yet.',
                style: CrymaText.headingSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'The buyer can start rider chat after the parcel has been picked up. Refresh to check again.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onRetry, child: const Text('Refresh')),
            ],
          ),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ),
        ),
      );
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Material(
        color: CrymaColors.error.withValues(alpha: 0.1),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(color: CrymaColors.error),
                ),
              ),
              TextButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      );
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onRetry,
    required this.error,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final VoidCallback? onRetry;
  final String? error;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            12,
            8,
            12,
            MediaQuery.of(context).viewInsets.bottom + 12,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      enabled: !sending,
                      maxLength: 2000,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => onSend(),
                      decoration: const InputDecoration(
                        hintText: 'Type a message…',
                        counterText: '',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: sending ? null : onSend,
                    icon: sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
              if (error != null && onRetry != null)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: sending ? null : onRetry,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Retry sending'),
                  ),
                ),
            ],
          ),
        ),
      );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMine,
    required this.time,
  });

  final RiderChatMessage message;
  final bool isMine;
  final String time;

  @override
  Widget build(BuildContext context) => Align(
        alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
          ),
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isMine ? CrymaColors.primary : CrymaColors.inputFill,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment:
                isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMine)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    message.senderName,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: CrymaColors.primary,
                    ),
                  ),
                ),
              Text(
                message.text,
                style: TextStyle(
                  color: isMine ? Colors.white : CrymaColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                time,
                style: TextStyle(
                  fontSize: 10,
                  color: isMine ? Colors.white70 : CrymaColors.textHint,
                ),
              ),
            ],
          ),
        ),
      );
}

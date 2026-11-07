import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({super.key, this.chatId});
  final String? chatId;

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  Map<String, dynamic>? _conversation;
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  List<Map<String, dynamic>> _orders = [];
  String? _selectedOrderId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final id = widget.chatId;
    if (id == null || id.isEmpty) {
      setState(() {
        _error = 'Select a conversation from Messages first.';
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final conversation =
          await ApiService.instance.getBuyerChatConversation(id);
      final messages = (conversation['messages'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
      try {
        await ApiService.instance.markBuyerChatRead(id);
      } catch (_) {
        // A read-receipt failure should not prevent the buyer from viewing chat.
      }
      final seller = conversation['seller'] as Map<String, dynamic>?;
      final sellerId = seller?['id']?.toString();
      final allOrders = (await ApiService.instance.getBuyerOrdersPage()).items;
      final orders = sellerId == null
          ? allOrders
          : allOrders.where((order) {
              final items = (order['items'] as List? ?? const [])
                  .whereType<Map<String, dynamic>>();
              return items
                  .any((item) => item['seller_id']?.toString() == sellerId);
            }).toList();
      if (!mounted) return;
      setState(() {
        _conversation = conversation;
        _messages = messages;
        _orders = orders;
        _loading = false;
      });
      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  String get _title {
    final seller = _conversation?['seller'] as Map<String, dynamic>?;
    final profile = seller?['seller_profile'] as Map<String, dynamic>?;
    final business = profile?['business_name']?.toString().trim();
    if (business != null && business.isNotEmpty) return business;
    if (seller != null) {
      final name =
          '${seller['first_name'] ?? ''} ${seller['last_name'] ?? ''}'.trim();
      if (name.isNotEmpty) return name;
    }
    return _conversation == null ? 'Conversation' : 'CRYMA Support';
  }

  bool _isMine(Map<String, dynamic> message) =>
      message['sender_type'] == 'user' || message['sender_type'] == 'buyer';

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    final id = widget.chatId;
    if (text.isEmpty || id == null || _sending) return;
    setState(() => _sending = true);
    try {
      await ApiService.instance.sendBuyerChatMessage(id, text,
          orderId: int.tryParse(_selectedOrderId ?? ''));
      _messageController.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _attachImage() async {
    final id = widget.chatId;
    if (id == null || _sending) return;
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() => _sending = true);
    try {
      await ApiService.instance.sendBuyerChatAttachment(
        id,
        file,
        orderId: int.tryParse(_selectedOrderId ?? ''),
      );
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _openAttachment(Map<String, dynamic> message) async {
    final id = widget.chatId;
    final messageId = message['id']?.toString();
    if (id == null || messageId == null) return;
    try {
      final response =
          await ApiService.instance.downloadBuyerChatAttachment(id, messageId);
      if (!mounted) return;
      await showDialog<void>(
          context: context,
          builder: (context) => Dialog(
              child: InteractiveViewer(
                  child:
                      Image.memory(response.bodyBytes, fit: BoxFit.contain))));
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(_scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(_title,
            style: const TextStyle(
                fontFamily: 'Poppins',
                color: AppColors.primary,
                fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(
                            onPressed: _load, child: const Text('Try again'))
                      ])))
              : Column(children: [
                  Expanded(
                    child: _messages.isEmpty
                        ? const Center(
                            child: Text(
                                'No messages yet. Send a message to start the conversation.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontFamily: 'Poppins',
                                    color: AppColors.gray)))
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final message = _messages[index];
                              final mine = _isMine(message);
                              final senderType =
                                  message['sender_type']?.toString();
                              return Align(
                                alignment: mine
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft,
                                child: Container(
                                  constraints: BoxConstraints(
                                      maxWidth:
                                          MediaQuery.sizeOf(context).width *
                                              .78),
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                      color: mine
                                          ? AppColors.primary
                                          : AppColors.white,
                                      borderRadius: BorderRadius.circular(16)),
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (senderType == 'assistant')
                                          const Text('CRYMA Support',
                                              style: TextStyle(
                                                  fontSize: 10,
                                                  color: AppColors.primary,
                                                  fontWeight: FontWeight.w600)),
                                        if (message['product']
                                            is Map<String, dynamic>)
                                          Text(
                                              'Product: ${(message['product'] as Map)['name'] ?? 'Shared item'}',
                                              style: TextStyle(
                                                  color: mine
                                                      ? AppColors.white
                                                      : AppColors.primary,
                                                  fontWeight: FontWeight.w600)),
                                        if (message['order']
                                            is Map<String, dynamic>)
                                          Text(
                                              'Order #${(message['order'] as Map)['id']} · ${(message['order'] as Map)['status'] ?? ''}',
                                              style: TextStyle(
                                                  color: mine
                                                      ? AppColors.white
                                                      : AppColors.primary,
                                                  fontWeight: FontWeight.w600)),
                                        Text(
                                            message['message']?.toString() ??
                                                '',
                                            style: TextStyle(
                                                fontFamily: 'Poppins',
                                                color: mine
                                                    ? AppColors.white
                                                    : AppColors.darkGray)),
                                        if ((message['attachment_name'] ?? '')
                                            .toString()
                                            .isNotEmpty)
                                          TextButton.icon(
                                              onPressed: () =>
                                                  _openAttachment(message),
                                              icon: Icon(Icons.image_outlined,
                                                  color: mine
                                                      ? AppColors.white
                                                      : AppColors.primary),
                                              label: Text('View image',
                                                  style: TextStyle(
                                                      color: mine
                                                          ? AppColors.white
                                                          : AppColors
                                                              .primary))),
                                      ]),
                                ),
                              );
                            },
                          ),
                  ),
                  SafeArea(
                    top: false,
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      if (_orders.isNotEmpty)
                        Padding(
                            padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                            child: DropdownButtonFormField<String?>(
                                initialValue: _selectedOrderId,
                                decoration: const InputDecoration(
                                    labelText: 'Attach an order (optional)',
                                    isDense: true),
                                items: [
                                  const DropdownMenuItem<String?>(
                                      value: null,
                                      child: Text('No order attached')),
                                  ..._orders.map((order) => DropdownMenuItem<
                                          String?>(
                                      value: order['id'].toString(),
                                      child: Text(
                                          'Order #${order['id']} · ${order['status'] ?? ''}')))
                                ],
                                onChanged: (value) =>
                                    setState(() => _selectedOrderId = value))),
                      Container(
                        color: AppColors.white,
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                        child: Row(children: [
                          if (_conversation?['seller'] == null)
                            IconButton(
                                tooltip: 'Attach an image',
                                onPressed: _sending ? null : _attachImage,
                                icon: const Icon(Icons.attach_file,
                                    color: AppColors.primary)),
                          Expanded(
                              child: TextField(
                                  controller: _messageController,
                                  minLines: 1,
                                  maxLines: 4,
                                  textInputAction: TextInputAction.send,
                                  onSubmitted: (_) => _sendMessage(),
                                  decoration: const InputDecoration(
                                      hintText: 'Write a message',
                                      border: OutlineInputBorder(),
                                      isDense: true,
                                      contentPadding: EdgeInsets.symmetric(
                                          horizontal: 14, vertical: 12)))),
                          const SizedBox(width: 8),
                          IconButton.filled(
                              onPressed: _sending ? null : _sendMessage,
                              icon: _sending
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2))
                                  : const Icon(Icons.send),
                              color: Colors.white,
                              style: IconButton.styleFrom(
                                  backgroundColor: AppColors.primary)),
                        ]),
                      ),
                    ]),
                  ),
                ]),
    );
  }
}

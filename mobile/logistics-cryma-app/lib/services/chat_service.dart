import 'dart:async';
import '../database/db_helper.dart';
import '../database/app_constants.dart';

class ConversationModel {
  final int id;
  final int riderId;
  final String title;
  final ConversationType conversationType;
  final String createdAt;
  String? lastMessage;
  String? lastMessageTime;
  int unreadCount;

  ConversationModel({
    required this.id,
    required this.riderId,
    required this.title,
    required this.conversationType,
    required this.createdAt,
    this.lastMessage,
    this.lastMessageTime,
    this.unreadCount = 0,
  });

  factory ConversationModel.fromMap(Map<String, dynamic> m) =>
      ConversationModel(
        id: m['id'] as int,
        riderId: m['rider_id'] as int,
        title: m['title'] as String,
        conversationType: ConversationTypeX.fromString(
            (m['conversation_type'] as String?) ?? 'logistics'),
        createdAt: m['created_at'] as String,
      );
}

class MessageModel {
  final int id;
  final int conversationId;
  final int? senderId;
  final String senderName;
  final String body;
  final MessageType messageType;
  final bool isRead;
  final String createdAt;

  const MessageModel({
    required this.id,
    required this.conversationId,
    this.senderId,
    required this.senderName,
    required this.body,
    required this.messageType,
    required this.isRead,
    required this.createdAt,
  });

  factory MessageModel.fromMap(Map<String, dynamic> m) => MessageModel(
        id: m['id'] as int,
        conversationId: m['conversation_id'] as int,
        senderId: m['sender_id'] as int?,
        senderName: m['sender_name'] as String,
        body: m['body'] as String,
        messageType: MessageTypeX.fromString(m['message_type'] as String),
        isRead: (m['is_read'] as int? ?? 0) == 1,
        createdAt: m['created_at'] as String,
      );
}

class ChatService {
  ChatService._();
  static final ChatService instance = ChatService._();

  final _db = DbHelper.instance;

  // ── Streams ──────────────────────────────────────────────────────────────

  /// Emits the conversation list for a rider every [interval].
  Stream<List<ConversationModel>> watchConversations(
    int riderId, {
    Duration interval = const Duration(seconds: 2),
  }) async* {
    while (true) {
      yield await getConversationsForRider(riderId);
      await Future.delayed(interval);
    }
  }

  /// Emits the message list for a conversation every [interval].
  Stream<List<MessageModel>> watchMessages(
    int conversationId, {
    Duration interval = const Duration(seconds: 2),
  }) async* {
    while (true) {
      yield await getMessages(conversationId);
      await Future.delayed(interval);
    }
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  Future<List<ConversationModel>> getConversationsForRider(int riderId) async {
    final rows = await _db.query(
      'conversations',
      where: 'rider_id = ?',
      whereArgs: [riderId],
      orderBy: 'created_at DESC',
    );
    final convos = rows.map(ConversationModel.fromMap).toList();
    for (final c in convos) {
      final msgs = await _db.query(
        'messages',
        where: 'conversation_id = ?',
        whereArgs: [c.id],
        orderBy: 'created_at DESC',
      );
      if (msgs.isNotEmpty) {
        c.lastMessage = msgs.first['body'] as String;
        c.lastMessageTime = msgs.first['created_at'] as String;
      }
      final unread = await _db.rawQuery(
        'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND is_read = 0 AND sender_id != ?',
        [c.id, riderId],
      );
      c.unreadCount = (unread.first['cnt'] as int? ?? 0);
    }
    // Sort: unread first, then by last message time desc
    convos.sort((a, b) {
      if (a.unreadCount > 0 && b.unreadCount == 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount == 0) return 1;
      final ta = a.lastMessageTime ?? a.createdAt;
      final tb = b.lastMessageTime ?? b.createdAt;
      return tb.compareTo(ta);
    });
    return convos;
  }

  Future<List<MessageModel>> getMessages(int conversationId) async {
    final rows = await _db.query(
      'messages',
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
      orderBy: 'created_at ASC',
    );
    return rows.map(MessageModel.fromMap).toList();
  }

  Future<int> getUnreadCount(int riderId) async {
    final result = await _db.rawQuery(
      'SELECT COUNT(*) as cnt FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.rider_id = ? AND m.is_read = 0 AND m.sender_id != ?',
      [riderId, riderId],
    );
    return result.first['cnt'] as int? ?? 0;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  Future<int> createConversation(
    int riderId,
    String title,
    ConversationType type,
  ) async {
    return _db.insert('conversations', {
      'rider_id': riderId,
      'title': title,
      'conversation_type': type.value,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  /// Returns existing conversation id or creates one.
  Future<int> getOrCreateConversation(
    int riderId,
    String title,
    ConversationType type,
  ) async {
    final rows = await _db.query(
      'conversations',
      where: 'rider_id = ? AND conversation_type = ?',
      whereArgs: [riderId, type.value],
    );
    if (rows.isNotEmpty) return rows.first['id'] as int;
    return createConversation(riderId, title, type);
  }

  Future<void> sendMessage({
    required int conversationId,
    int? senderId,
    required String senderName,
    required String body,
    MessageType messageType = MessageType.normal,
  }) async {
    await _db.insert('messages', {
      'conversation_id': conversationId,
      'sender_id': senderId,
      'sender_name': senderName,
      'body': body,
      'message_type': messageType.value,
      'is_read': 0,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  /// Mark all messages in a conversation as read by [readerId].
  Future<void> markConversationRead(int conversationId, int readerId) async {
    await _db.update(
      'messages',
      {'is_read': 1},
      where: 'conversation_id = ? AND sender_id != ? AND is_read = 0',
      whereArgs: [conversationId, readerId],
    );
  }

  Future<List<MessageModel>> getWarningNoticesForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT m.* FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.rider_id = ? AND m.message_type = ?
      ORDER BY m.created_at DESC
    ''', [riderId, MessageType.warningNotice.value]);
    return rows.map(MessageModel.fromMap).toList();
  }

  Future<void> sendWarningNotice({
    required int riderId,
    required int superUserId,
    required String message,
  }) async {
    final convoId = await getOrCreateConversation(
      riderId,
      'Warning Notice',
      ConversationType.warning,
    );
    await sendMessage(
      conversationId: convoId,
      senderId: superUserId,
      senderName: kSuperUserDisplayName,
      body: message,
      messageType: MessageType.warningNotice,
    );
  }
}

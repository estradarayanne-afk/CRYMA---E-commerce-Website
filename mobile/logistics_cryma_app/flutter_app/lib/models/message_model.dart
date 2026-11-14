class Conversation {
  final String id;
  final String participantId;
  final String participantName;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;

  Conversation({
    required this.id,
    required this.participantId,
    required this.participantName,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String? ?? '',
      participantId: json['participantId'] as String? ?? '',
      participantName: json['participantName'] as String? ?? '',
      lastMessage: json['lastMessage'] as String? ?? '',
      lastMessageTime: json['lastMessageTime'] != null
          ? DateTime.parse(json['lastMessageTime'] as String)
          : DateTime.now(),
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'participantId': participantId,
      'participantName': participantName,
      'lastMessage': lastMessage,
      'lastMessageTime': lastMessageTime.toIso8601String(),
      'unreadCount': unreadCount,
    };
  }
}

class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime timestamp;
  final bool isRead;

  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.timestamp,
    this.isRead = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      senderName: json['senderName'] as String? ?? '',
      content: json['content'] as String? ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'senderId': senderId,
      'senderName': senderName,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
    };
  }
}

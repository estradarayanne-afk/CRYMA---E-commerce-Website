import { Conversation, Message } from '../types/models';
import { getDb } from '../database/db';

export class MessageRepository {
  async createConversation(riderId: number, title: string): Promise<Conversation> {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO conversations (rider_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [riderId, title, now, now]
    );

    const conversation = await this.getConversationById(result.lastID);
    if (!conversation) throw new Error('Failed to create conversation');
    return conversation;
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    const db = getDb();
    return await db.get('SELECT * FROM conversations WHERE id = ?', [id]);
  }

  async getConversationsForRider(riderId: number): Promise<Conversation[]> {
    const db = getDb();
    return await db.all(
      'SELECT * FROM conversations WHERE rider_id = ? ORDER BY created_at DESC',
      [riderId]
    );
  }

  async createMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const db = getDb();
    const result = await db.run(
      `INSERT INTO messages (
        conversation_id, sender_id, sender_name, body, message_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.conversationId,
        message.senderId,
        message.senderName,
        message.body,
        message.messageType,
        message.createdAt,
      ]
    );

    const newMessage = await this.getMessageById(result.lastID);
    if (!newMessage) throw new Error('Failed to create message');
    return newMessage;
  }

  async getMessageById(id: number): Promise<Message | null> {
    const db = getDb();
    return await db.get('SELECT * FROM messages WHERE id = ?', [id]);
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const db = getDb();
    return await db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
  }

  async getWarningNotices(riderId: number): Promise<Message[]> {
    const db = getDb();
    return await db.all(
      `SELECT m.* FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.rider_id = ? AND m.message_type = ?
       ORDER BY m.created_at DESC`,
      [riderId, 'warning_notice']
    );
  }

  async deleteConversation(id: number): Promise<void> {
    const db = getDb();
    // Messages will be deleted automatically due to foreign key cascade
    await db.run('DELETE FROM conversations WHERE id = ?', [id]);
  }
}

export const messageRepository = new MessageRepository();

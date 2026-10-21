<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class ConversationMessageSender
{
    public function send(
        Conversation $conversation,
        User $sender,
        string $message,
        ?string $clientMessageId
    ): Message {
        if ($clientMessageId !== null) {
            $existing = Message::where('sender_id', $sender->id)
                ->where('client_message_id', $clientMessageId)
                ->first();
            if ($existing) {
                $this->assertMatchingRetry($existing, $conversation, $message);
                return $existing;
            }
        }

        try {
            return DB::transaction(function () use ($conversation, $sender, $message, $clientMessageId) {
                $created = Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $sender->id,
                    'message' => trim($message),
                    'is_read' => false,
                    'client_message_id' => $clientMessageId,
                ]);
                $conversation->touch();

                return $created;
            });
        } catch (QueryException $exception) {
            if ($clientMessageId === null) {
                throw $exception;
            }

            $existing = Message::where('sender_id', $sender->id)
                ->where('client_message_id', $clientMessageId)
                ->first();
            if (!$existing) {
                throw $exception;
            }

            $this->assertMatchingRetry($existing, $conversation, $message);
            return $existing;
        }
    }

    private function assertMatchingRetry(Message $existing, Conversation $conversation, string $message): void
    {
        abort_unless(
            (int) $existing->conversation_id === (int) $conversation->id
                && $existing->message === trim($message),
            409,
            'This message request identifier has already been used for different content.'
        );
    }
}

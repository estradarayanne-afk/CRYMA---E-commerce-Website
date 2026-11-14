<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryConversationMessage extends Model
{
    protected $fillable = [
        'delivery_conversation_id',
        'sender_id',
        'message',
        'client_message_id',
        'is_read',
    ];

    protected $hidden = ['client_message_id'];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(DeliveryConversation::class, 'delivery_conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

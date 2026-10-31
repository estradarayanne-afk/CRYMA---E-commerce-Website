<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $hidden = ['client_message_id', 'attachment_path'];

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'sender_type',
        'order_id',
        'product_id',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'message',
        'is_read',
        'client_message_id',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

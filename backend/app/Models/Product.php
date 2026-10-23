<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Review;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'name',
        'sku',
        'description',
        'price',
        'discounted_price',
        'stock',
        'category',
        'status',
        'review_status',
        'review_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'discounted_price' => 'decimal:2',
            'stock' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class)->orderBy('position')->orderBy('id');
    }

    public function sellingPrice(): string
    {
        return $this->discounted_price ?? $this->price;
    }

    /**
     * Get the seller who owns this product.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

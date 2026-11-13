<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ProductDailyMetric extends Model
{
    protected $fillable = [
        'product_id',
        'seller_id',
        'product_name',
        'seller_name',
        'metric_date',
        'impressions',
        'detail_views',
        'purchase_count',
        'units_sold',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date:Y-m-d',
            'impressions' => 'integer',
            'detail_views' => 'integer',
            'purchase_count' => 'integer',
            'units_sold' => 'integer',
        ];
    }

    public static function recordView(Product $product): void
    {
        $today = now('Asia/Manila')->toDateString();
        self::ensureDailyRow($product, $today);

        self::query()
            ->where('product_id', $product->id)
            ->where('metric_date', $today)
            ->increment('detail_views');
    }

    public static function recordImpression(Product $product): void
    {
        $today = now('Asia/Manila')->toDateString();
        self::ensureDailyRow($product, $today);

        self::query()
            ->where('product_id', $product->id)
            ->where('metric_date', $today)
            ->increment('impressions');
    }

    public static function recordPurchase(Product $product, int $quantity): void
    {
        $today = now('Asia/Manila')->toDateString();
        self::ensureDailyRow($product, $today);

        self::query()
            ->where('product_id', $product->id)
            ->where('metric_date', $today)
            ->incrementEach([
                'purchase_count' => 1,
                'units_sold' => $quantity,
            ]);
    }

    private static function ensureDailyRow(Product $product, string $today): void
    {
        $sellerName = $product->seller?->sellerProfile?->business_name
            ?: trim(($product->seller?->first_name ?? '').' '.($product->seller?->last_name ?? ''))
            ?: 'Seller';
        DB::table('product_daily_metrics')->insertOrIgnore([
            'product_id' => $product->id,
            'seller_id' => $product->seller_id,
            'product_name' => $product->name,
            'seller_name' => $sellerName,
            'metric_date' => $today,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

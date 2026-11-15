<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PRODUCTS = [
        1 => 'Luna Everyday Tote',
        2 => 'Mira Knit Set',
        3 => 'Harbor Ceramic Vase',
        4 => 'Harbor Ceramic Vase',
        5 => 'Mira Knit Set',
        6 => 'Luna Everyday Tote',
        7 => 'Amber Desk Lamp',
        8 => 'Nori Travel Bottle',
        9 => 'Sol Linen Shirt',
        10 => 'Cove Woven Basket',
        11 => 'Mallow Leather Wallet',
        12 => 'Aster Wireless Speaker',
        13 => 'Pia Ceramic Mug',
        14 => 'T-shirt',
    ];

    public function up(): void
    {
        $archivedAt = now();

        $this->confirmedProducts()
            ->where('status', 'active')
            ->whereNotExists(fn (Builder $media) => $media
                ->selectRaw('1')
                ->from('product_media')
                ->whereColumn('product_media.product_id', 'products.id')
                ->where('product_media.type', 'image'))
            ->update([
                'status' => 'archived',
                'archived_at' => $archivedAt,
                'updated_at' => $archivedAt,
            ]);
    }

    public function down(): void
    {
        $this->confirmedProducts()
            ->where('status', 'archived')
            ->whereNotNull('archived_at')
            ->whereColumn('archived_at', 'updated_at')
            ->update([
                'status' => 'active',
                'archived_at' => null,
                'updated_at' => now(),
            ]);
    }

    private function confirmedProducts(): Builder
    {
        return DB::table('products')
            ->where(function (Builder $products): void {
                foreach (self::PRODUCTS as $id => $name) {
                    $products->orWhere(fn (Builder $product) => $product
                        ->where('id', $id)
                        ->where('name', $name));
                }
            });
    }
};

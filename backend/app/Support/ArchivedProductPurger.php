<?php

namespace App\Support;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;

class ArchivedProductPurger
{
    public const RETENTION_DAYS = 60;

    public function purge(?int $sellerId = null, int $days = self::RETENTION_DAYS): int
    {
        $cutoff = now()->subDays(max(1, $days));
        $query = Product::query()
            ->where('status', 'archived')
            ->whereNotNull('archived_at')
            ->where('archived_at', '<=', $cutoff)
            ->whereDoesntHave('orderItems')
            ->whereDoesntHave('reviews');

        if ($sellerId !== null) $query->where('seller_id', $sellerId);

        $purged = 0;
        $query->with('media')->chunkById(100, function ($products) use (&$purged): void {
            foreach ($products as $product) {
                $variantPaths = collect($product->variants ?? [])
                    ->flatMap(fn (array $variant) => [$variant['media_path'] ?? null, $variant['image'] ?? null])
                    ->filter()
                    ->all();
                $paths = array_values(array_unique(array_merge($product->media->pluck('path')->all(), $variantPaths)));

                $product->delete();
                if ($paths) Storage::disk('public')->delete($paths);
                $purged++;
            }
        });

        return $purged;
    }
}

<?php

namespace App\Support;

use App\Models\Product;

class SellerProductCompliance
{
    /**
     * These terms identify listings that need an administrator's review. They
     * are screening signals, not automatic determinations of a policy breach.
     */
    private const RESTRICTED_TERMS = [
        'weapon', 'firearm', 'gun', 'ammunition', 'explosive', 'bomb',
        'narcotic', 'cocaine', 'heroin', 'methamphetamine', 'counterfeit',
        'stolen goods', 'tobacco', 'cigarette', 'vape', 'e-cigarette',
        'pornography', 'explicit adult',
    ];

    public static function inspect(Product $product, ?string $registeredCategory): array
    {
        $findings = [];
        $registeredCategory = trim((string) $registeredCategory);

        if ($registeredCategory !== '' && mb_strtolower(trim($product->category)) !== mb_strtolower($registeredCategory)) {
            $findings[] = [
                'type' => 'category_mismatch',
                'label' => 'Category does not match seller registration',
                'message' => "Seller is registered for {$registeredCategory}; this listing is categorized as {$product->category}.",
            ];
        }

        $listingText = mb_strtolower(implode(' ', array_filter([
            $product->name,
            $product->description,
            $product->category,
        ])));

        foreach (self::RESTRICTED_TERMS as $term) {
            if (preg_match('/(?<![\pL\pN])' . preg_quote($term, '/') . '(?![\pL\pN])/u', $listingText)) {
                $findings[] = [
                    'type' => 'restricted_term',
                    'label' => 'Potentially restricted or inappropriate content',
                    'message' => 'Listing text contains a term that may require policy review.',
                    'matched_term' => $term,
                ];
            }
        }

        return [
            'is_flagged' => count($findings) > 0,
            'findings' => $findings,
        ];
    }
}

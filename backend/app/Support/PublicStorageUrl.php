<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PublicStorageUrl
{
    public static function url(string $path): string
    {
        $url = Storage::disk('public')->url($path);
        if (config('filesystems.disks.public.driver') !== 'local') {
            return $url;
        }

        $relativePath = parse_url($url, PHP_URL_PATH);

        return is_string($relativePath) ? $relativePath : $url;
    }
}

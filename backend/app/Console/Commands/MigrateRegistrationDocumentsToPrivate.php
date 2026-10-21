<?php

namespace App\Console\Commands;

use App\Models\UserDocument;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateRegistrationDocumentsToPrivate extends Command
{
    protected $signature = 'cryma:migrate-registration-documents {--delete-public : Delete the public copy only after its private copy is verified}';

    protected $description = 'Copy legacy registration documents to private storage and verify each copy';

    public function handle(): int
    {
        $copied = 0;
        $alreadyPrivate = 0;
        $deleted = 0;
        $failed = 0;

        UserDocument::query()->orderBy('id')->chunkById(100, function ($documents) use (&$copied, &$alreadyPrivate, &$deleted, &$failed) {
            foreach ($documents as $document) {
                $path = (string) $document->file_path;
                $expectedPrefix = "registration-documents/{$document->user_id}/";
                if (!str_starts_with($path, $expectedPrefix) || !preg_match('/\Aregistration-documents\/[1-9][0-9]*\/[A-Za-z0-9._-]+\z/', $path)) {
                    $failed++;
                    continue;
                }

                $public = Storage::disk('public');
                $private = Storage::disk('local');
                $hasPublic = $public->exists($path);
                $hasPrivate = $private->exists($path);
                if (!$hasPublic && !$hasPrivate) {
                    $failed++;
                    continue;
                }

                if ($hasPublic) {
                    $publicContents = $public->get($path);
                    if (!$hasPrivate) {
                        if (!$private->put($path, $publicContents)) {
                            $failed++;
                            continue;
                        }
                        $copied++;
                    } elseif (!hash_equals(hash('sha256', $publicContents), hash('sha256', $private->get($path)))) {
                        $failed++;
                        continue;
                    } else {
                        $alreadyPrivate++;
                    }

                    if (!hash_equals(hash('sha256', $publicContents), hash('sha256', $private->get($path)))) {
                        $failed++;
                        continue;
                    }
                    if ($this->option('delete-public') && $private->exists($path)) {
                        $public->delete($path);
                        if (!$public->exists($path)) $deleted++;
                        else $failed++;
                    }
                } else {
                    $alreadyPrivate++;
                }
            }
        });

        $this->info("Migration finished: copied={$copied}, already-private={$alreadyPrivate}, public-copies-removed={$deleted}, failed={$failed}.");
        if (!$this->option('delete-public')) {
            $this->comment('Public copies were retained. Verify protected admin access before running again with --delete-public.');
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}

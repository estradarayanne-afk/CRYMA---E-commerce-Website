<?php

namespace App\Console\Commands;

use App\Support\ArchivedProductPurger;
use Illuminate\Console\Command;

class PurgeArchivedProducts extends Command
{
    protected $signature = 'products:purge-archived {--days=60 : Days an item must remain archived before removal}';

    protected $description = 'Remove expired archived products that have no order or review history';

    public function handle(ArchivedProductPurger $purger): int
    {
        $days = max(1, (int) $this->option('days'));
        $purged = $purger->purge(days: $days);
        $this->info("Purged {$purged} expired archived product(s). Products with order or review history were kept.");

        return self::SUCCESS;
    }
}

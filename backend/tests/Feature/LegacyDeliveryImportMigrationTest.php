<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LegacyDeliveryImportMigrationTest extends TestCase
{
    public function test_legacy_import_records_only_import_time_and_does_not_create_historical_assignments(): void
    {
        $connection = 'delivery_migration_test';
        $previous = config('database.default');
        config(['database.connections.'.$connection => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
        ]]);
        config(['database.default' => $connection]);
        DB::purge($connection);

        try {
            Schema::create('users', function (Blueprint $table) { $table->id(); });
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->string('status');
                $table->timestamp('updated_at')->nullable();
            });
            Schema::create('courier_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained();
            });
            $orderId = DB::table('orders')->insertGetId(['status' => 'DELIVERED', 'updated_at' => '2020-01-01 00:00:00']);
            $migration = require database_path('migrations/2026_10_21_000001_create_delivery_workflow_tables.php');
            $before = now()->subSeconds(2);
            $migration->up();
            $after = now()->addSeconds(2);

            $delivery = DB::table('deliveries')->where('order_id', $orderId)->first();
            $event = DB::table('delivery_events')->where('delivery_id', $delivery->id)->first();
            $this->assertTrue((bool) $delivery->legacy_imported);
            $this->assertNull($delivery->courier_profile_id);
            $this->assertNull($delivery->assigned_at);
            $this->assertNull($delivery->picked_up_at);
            $this->assertNull($delivery->delivered_at);
            $this->assertNull($event->actor_id);
            $this->assertNull($event->courier_profile_id);
            $this->assertSame('legacy_import', $event->event_type);
            $this->assertGreaterThanOrEqual($before->timestamp, strtotime($event->created_at));
            $this->assertLessThanOrEqual($after->timestamp, strtotime($event->created_at));
        } finally {
            DB::purge($connection);
            config(['database.default' => $previous]);
            DB::purge();
        }
    }
}

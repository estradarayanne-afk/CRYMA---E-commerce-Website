<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('parcel_code', 32)->nullable()->unique();
        });

        DB::table('deliveries')->whereNull('parcel_code')->orderBy('id')->chunkById(100, function ($deliveries): void {
            foreach ($deliveries as $delivery) {
                do {
                    $code = 'CRYMA-PCL-'.Str::upper(Str::random(20));
                } while (DB::table('deliveries')->where('parcel_code', $code)->exists());

                DB::table('deliveries')->where('id', $delivery->id)->update(['parcel_code' => $code]);
            }
        });
    }

    public function down(): void
    {
        if (DB::table('deliveries')->whereNotNull('parcel_code')->exists()) {
            throw new RuntimeException('Parcel identifiers are printed on labels and retained in tracking history; this migration cannot be rolled back after issuance.');
        }

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropUnique(['parcel_code']);
            $table->dropColumn('parcel_code');
        });
    }
};

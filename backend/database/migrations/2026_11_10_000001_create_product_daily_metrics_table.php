<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('seller_id');
            $table->string('product_name');
            $table->string('seller_name');
            $table->date('metric_date');
            $table->unsignedInteger('impressions')->default(0);
            $table->unsignedInteger('detail_views')->default(0);
            $table->unsignedInteger('purchase_count')->default(0);
            $table->unsignedInteger('units_sold')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'metric_date']);
            $table->index(['seller_id', 'metric_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_daily_metrics');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $dataPath = database_path('data/psgc-2026-q2/index.json');
        if (! is_file($dataPath)) {
            throw new RuntimeException('The pinned PSGC dataset is missing: '.$dataPath);
        }

        $metadataPath = database_path('data/psgc-2026-q2/metadata.json');
        if (! is_file($metadataPath)) {
            throw new RuntimeException('The pinned PSGC dataset metadata is missing: '.$metadataPath);
        }
        $metadata = json_decode(file_get_contents($metadataPath), true, flags: JSON_THROW_ON_ERROR);
        if (! hash_equals(strtolower($metadata['mirror_source_file_sha256'] ?? ''), hash_file('sha256', $dataPath))) {
            throw new RuntimeException('The pinned PSGC dataset checksum does not match its metadata.');
        }

        $records = json_decode(file_get_contents($dataPath), true, flags: JSON_THROW_ON_ERROR);
        $expectedCounts = $metadata['counts'] ?? [];
        if ($expectedCounts !== ['Reg' => 18, 'Prov' => 84, 'City' => 149, 'Mun' => 1493, 'SubMun' => 14, 'Bgy' => 42010]) {
            throw new RuntimeException('The pinned PSGC dataset metadata has unexpected entity counts.');
        }
        $actualCounts = [];
        foreach ($records as $record) {
            if (! is_array($record) || count($record) !== 3 || ! in_array($record[1], array_keys($expectedCounts), true)) {
                throw new RuntimeException('The pinned PSGC dataset contains an invalid record.');
            }
            $actualCounts[$record[1]] = ($actualCounts[$record[1]] ?? 0) + 1;
        }
        foreach ($expectedCounts as $level => $count) {
            if (($actualCounts[$level] ?? 0) !== $count) {
                throw new RuntimeException("The pinned PSGC dataset has an unexpected {$level} count.");
            }
        }

        Schema::create('geographic_locations', function (Blueprint $table): void {
            $table->char('code', 10)->primary();
            $table->string('name', 255);
            $table->string('level', 8);
            $table->char('parent_code', 10)->nullable();
            $table->foreign('parent_code')->references('code')->on('geographic_locations')->nullOnDelete();
            $table->index(['parent_code', 'level', 'name'], 'geographic_locations_parent_level_name_index');
        });

        $levelOrder = ['Reg' => 0, 'Prov' => 1, 'City' => 2, 'Mun' => 2, 'SubMun' => 3, 'Bgy' => 4];
        $rows = [];
        foreach ($records as $code => [$name, $level, $parentCode]) {
            if (! preg_match('/\A[0-9]{10}\z/', (string) $code) || ! is_string($name) || trim($name) === '') {
                throw new RuntimeException('The pinned PSGC dataset contains an invalid code or name.');
            }
            if ($parentCode !== null && ! array_key_exists($parentCode, $records)) {
                throw new RuntimeException("The pinned PSGC dataset references a missing parent for {$code}.");
            }
            $rows[] = [
                'code' => $code,
                'name' => $name,
                'level' => $level,
                'parent_code' => $parentCode,
            ];
        }
        usort($rows, fn (array $left, array $right): int => $levelOrder[$left['level']] <=> $levelOrder[$right['level']]);

        foreach (array_chunk($rows, 250) as $chunk) {
            DB::table('geographic_locations')->insert($chunk);
        }

        Schema::table('addresses', function (Blueprint $table): void {
            $table->char('psgc_code', 10)->nullable()->after('barangay');
            $table->foreign('psgc_code')->references('code')->on('geographic_locations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table): void {
            $table->dropForeign(['psgc_code']);
            $table->dropColumn('psgc_code');
        });
        Schema::dropIfExists('geographic_locations');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->replaceUserRoleValues(['admin', 'seller', 'buyer', 'rider', 'logistics', 'hub_staff']);

        Schema::table('logistics_profiles', function (Blueprint $table) {
            $table->boolean('can_manage_hub_staff')->default(false);
            $table->foreignId('hub_staff_capability_granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('hub_staff_capability_granted_at')->nullable();
            $table->foreignId('hub_staff_capability_revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('hub_staff_capability_revoked_at')->nullable();
        });

        Schema::create('hub_staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('hub_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamps();
            $table->index('hub_id');
        });

        Schema::create('hub_staff_audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 64);
            $table->foreignId('from_hub_id')->nullable()->constrained('logistics_hubs')->nullOnDelete();
            $table->foreignId('to_hub_id')->nullable()->constrained('logistics_hubs')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_user_id', 'created_at']);
            $table->index(['event_type', 'created_at']);
        });
    }

    public function down(): void
    {
        if (DB::table('users')->where('role', 'hub_staff')->exists()) {
            throw new RuntimeException('Hub Staff accounts exist; the Hub Staff role cannot be removed safely.');
        }
        if (DB::table('hub_staff_audit_events')->exists()) {
            throw new RuntimeException('Hub Staff audit events exist; this migration cannot be rolled back without losing audit history.');
        }

        Schema::dropIfExists('hub_staff_profiles');
        Schema::dropIfExists('hub_staff_audit_events');

        Schema::table('logistics_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hub_staff_capability_granted_by');
            $table->dropColumn(['can_manage_hub_staff', 'hub_staff_capability_granted_at']);
            $table->dropConstrainedForeignId('hub_staff_capability_revoked_by');
            $table->dropColumn('hub_staff_capability_revoked_at');
        });

        $this->replaceUserRoleValues(['admin', 'seller', 'buyer', 'rider', 'logistics']);
    }

    private function replaceUserRoleValues(array $roles): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['sqlite', 'mysql', 'mariadb'], true)) {
            Schema::table('users', function (Blueprint $table) use ($roles) {
                $table->enum('role', $roles)->change();
            });

            return;
        }

        $quotedValues = implode(', ', array_map(fn (string $role) => DB::getPdo()->quote($role), $roles));

        if ($driver === 'pgsql') {
            $constraints = DB::select("SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE t.relname = 'users' AND n.nspname = current_schema() AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%role%'");
            foreach ($constraints as $constraint) {
                $name = str_replace('"', '""', $constraint->conname);
                DB::statement('ALTER TABLE "users" DROP CONSTRAINT "'.$name.'"');
            }
            DB::statement('ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(255) USING "role"::varchar');
            DB::statement('ALTER TABLE "users" ADD CONSTRAINT "users_role_allowed_values" CHECK ("role" IN ('.$quotedValues.'))');

            return;
        }

        if ($driver === 'sqlsrv') {
            $constraints = DB::select("SELECT cc.name FROM sys.check_constraints cc WHERE cc.parent_object_id = OBJECT_ID(N'users') AND cc.definition LIKE '%role%'");
            foreach ($constraints as $constraint) {
                $name = str_replace(']', ']]', $constraint->name);
                DB::statement('ALTER TABLE [users] DROP CONSTRAINT ['.$name.']');
            }
            DB::statement('ALTER TABLE [users] ALTER COLUMN [role] NVARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE [users] ADD CONSTRAINT [CK_users_role_allowed_values] CHECK ([role] IN ('.$quotedValues.'))');

            return;
        }

        throw new RuntimeException("The Hub Staff role migration does not support database driver [{$driver}].");
    }
};

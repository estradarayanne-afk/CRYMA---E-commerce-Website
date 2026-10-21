<?php

namespace Database\Seeders;

use App\Models\BuyerProfile;
use App\Models\CourierProfile;
use App\Models\DeliveryArea;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use App\Services\CourierEligibility;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class DevelopmentLoginAccountsSeeder extends Seeder
{
    private const PASSWORD = 'crymashop123';

    /** @var list<string> */
    private array $fixturePaths = [];

    /**
     * Create local-only login fixtures for roles that do not yet have an account.
     * Existing role accounts are never changed or duplicated.
     */
    public function run(): void
    {
        $this->guardEnvironment();
        $summaries = [];

        try {
            DB::transaction(function () use (&$summaries): void {
                $summaries['Admin'] = $this->seedSingleRole('admin', 'admin@cryma.com');
                $summaries['Buyer'] = $this->seedSingleRole('buyer', 'buyer@cryma.com');
                $summaries['Seller'] = $this->seedSingleRole('seller', 'seller@cryma.com');

                $riderRoleAlreadyExists = User::where('role', 'rider')->exists();
                $summaries['Pickup Courier'] = $this->seedCourier('pickup@cryma.com', 'Pickup', $riderRoleAlreadyExists);
                $summaries['Delivery Courier'] = $this->seedCourier('delivery@cryma.com', 'Delivery', $riderRoleAlreadyExists);
            });
        } catch (Throwable $exception) {
            foreach ($this->fixturePaths as $path) {
                Storage::disk('local')->delete($path);
            }

            throw $exception;
        }

        foreach ($summaries as $label => $summary) {
            $this->command?->line("{$label}: {$summary}");
        }
        $this->command?->line('Support: NEEDS ATTENTION — the application does not define a support role.');

        if (! class_exists(DeliveryArea::class) || ! DB::getSchemaBuilder()->hasTable('delivery_areas')) {
            $this->command?->warn('Delivery courier area assignment: NEEDS ATTENTION — apply the approved logistics migrations, then configure a delivery area and associate eligible couriers.');
        } else {
            $this->command?->warn('Delivery courier area assignment: NEEDS ATTENTION — an administrator must configure the area and courier association.');
        }
        $this->command?->warn('Buyer checkout: add a verified address through the account UI; this seeder does not invent locality or postal-code data.');
    }

    private function seedSingleRole(string $role, string $email): string
    {
        $existing = User::where('role', $role)->get();
        if ($existing->isNotEmpty()) {
            $issues = $this->existingAccountIssues($role, $existing->all());
            return $issues === []
                ? 'SKIPPED — suitable account already exists; no changes made.'
                : 'NEEDS ATTENTION — existing account(s) were preserved; '.implode('; ', $issues).'. No duplicate created.';
        }

        return $this->createAccount($role, $email, ucfirst($role));
    }

    private function seedCourier(string $email, string $courierLabel, bool $riderRoleAlreadyExists): string
    {
        if ($riderRoleAlreadyExists) {
            $eligible = app(CourierEligibility::class)->profiles()->count();
            return $eligible > 0
                ? "SKIPPED — suitable rider account already exists; no additional {$courierLabel} rider created."
                : "NEEDS ATTENTION — existing rider account(s) are not eligible (active, email-verified, profile, vehicle and approved valid ID, OR/CR, and driver's license are required). No duplicate created.";
        }

        if (User::whereRaw('LOWER(email) = ?', [strtolower($email)])->exists()) {
            return 'NEEDS ATTENTION — requested email is already assigned to another role; no account created.';
        }

        $user = $this->createBaseUser('rider', $email, $courierLabel);
        $profile = CourierProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);
        Vehicle::create([
            'courier_profile_id' => $profile->id,
            'vehicle_type' => 'motorcycle',
            'plate_number' => 'DEV'.strtoupper(Str::random(8)),
        ]);
        $this->createApprovedFixtureDocument($user, 'valid_id');
        $this->createApprovedFixtureDocument($user, 'or_cr');
        $this->createApprovedFixtureDocument($user, 'drivers_license');

        return "CREATED — {$email}; development password: ".self::PASSWORD;
    }

    private function createAccount(string $role, string $email, string $label): string
    {
        if (User::whereRaw('LOWER(email) = ?', [strtolower($email)])->exists()) {
            return 'NEEDS ATTENTION — requested email is already assigned to another role; no account created.';
        }

        $user = $this->createBaseUser($role, $email, $label);

        if ($role === 'buyer') {
            BuyerProfile::create([
                'user_id' => $user->id,
                'sex' => 'prefer_not_to_say',
                'birthday' => '1990-01-01',
            ]);
            $this->createApprovedFixtureDocument($user, 'valid_id');
        }

        if ($role === 'seller') {
            SellerProfile::create([
                'user_id' => $user->id,
                'sex' => 'prefer_not_to_say',
                'birthday' => '1990-01-01',
                'business_name' => 'CRYMA Development Test Shop',
                'line_of_business' => 'Development testing only',
            ]);
            $this->createApprovedFixtureDocument($user, 'valid_id');
            $this->createApprovedFixtureDocument($user, 'business_permit');
        }

        return "CREATED — {$email}; development password: ".self::PASSWORD;
    }

    private function createBaseUser(string $role, string $email, string $label): User
    {
        return User::forceCreate([
            'first_name' => 'CRYMA',
            'middle_name' => null,
            'last_name' => $label.' Test Account',
            'email' => $email,
            'phone' => null,
            'password' => Hash::make(self::PASSWORD),
            'role' => $role,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function createApprovedFixtureDocument(User $user, string $type): void
    {
        // This explicitly fictional PDF is only a development fixture, never a government document.
        $filename = 'DEV_FIXTURE_NOT_A_REAL_DOCUMENT_'.Str::uuid().'.pdf';
        $path = "registration-documents/{$user->id}/{$filename}";
        $contents = $this->developmentPdf("CRYMA DEVELOPMENT FIXTURE - {$type} - NOT A REAL OR GOVERNMENT-ISSUED DOCUMENT");

        if (! Storage::disk('local')->put($path, $contents)) {
            throw new RuntimeException('Unable to write a private development document fixture.');
        }

        $this->fixturePaths[] = $path;
        UserDocument::create([
            'user_id' => $user->id,
            'document_type' => $type,
            'file_path' => $path,
            'original_file_name' => $filename,
            'mime_type' => 'application/pdf',
            'file_size' => strlen($contents),
            'status' => 'approved',
        ]);
    }

    private function developmentPdf(string $label): string
    {
        $label = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $label);
        $stream = "BT /F1 16 Tf 50 740 Td ({$label}) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$object}\nendobj\n";
        }
        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        for ($index = 1; $index <= count($objects); $index++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$index])."\n";
        }
        $pdf .= "trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";

        return $pdf;
    }

    /** @param list<User> $users
     *  @return list<string>
     */
    private function existingAccountIssues(string $role, array $users): array
    {
        $issues = [];
        $hasLoginReady = collect($users)->contains(fn (User $user) => $user->status === 'active' && $user->email_verified_at !== null);
        if (! $hasLoginReady) {
            $issues[] = 'no existing account passes the active and email-verified login checks';
        }

        $profileRelation = match ($role) {
            'buyer' => 'buyerProfile',
            'seller' => 'sellerProfile',
            default => null,
        };
        $documentTypes = match ($role) {
            'buyer' => ['valid_id'],
            'seller' => ['valid_id', 'business_permit'],
            default => [],
        };
        $hasProfile = $profileRelation === null
            || collect($users)->contains(fn (User $user) => $user->{$profileRelation}()->exists());
        if (! $hasProfile) {
            $issues[] = "{$role} profile is missing";
        }

        $hasDocuments = collect($users)->contains(function (User $user) use ($documentTypes): bool {
            foreach ($documentTypes as $documentType) {
                if (! $user->documents()->where('document_type', $documentType)->where('status', 'approved')->exists()) {
                    return false;
                }
            }
            return true;
        });
        if (! $hasDocuments && $documentTypes !== []) {
            $issues[] = 'no account has all required approved development documents';
        }

        $singleAccountSuitable = collect($users)->contains(function (User $user) use ($profileRelation, $documentTypes): bool {
            if ($user->status !== 'active' || $user->email_verified_at === null) return false;
            if ($profileRelation !== null && ! $user->{$profileRelation}()->exists()) return false;
            foreach ($documentTypes as $documentType) {
                if (! $user->documents()->where('document_type', $documentType)->where('status', 'approved')->exists()) return false;
            }
            return true;
        });
        if (! $singleAccountSuitable && $issues === []) {
            $issues[] = 'requirements are split across accounts; no single account is suitable';
        }

        return $issues;
    }

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Development login accounts may only be seeded in local, development, or testing environments.');
        }
    }
}

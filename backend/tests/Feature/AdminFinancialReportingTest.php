<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFinancialReportingTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function buyer(): User
    {
        return User::factory()->create(['role' => 'buyer', 'status' => 'active']);
    }

    /**
     * Create a minimal order directly (no checkout flow needed for reporting tests).
     */
    private function order(User $buyer, string $status, string $total = '100.00'): Order
    {
        return Order::create([
            'buyer_id'         => $buyer->id,
            'delivery_address' => 'Test address',
            'payment_method'   => 'cash_on_delivery',
            'subtotal'         => $total,
            'shipping_fee'     => '0.00',
            'total_amount'     => $total,
            'status'           => $status,
        ]);
    }

    // -------------------------------------------------------------------------
    // Dashboard tests
    // -------------------------------------------------------------------------

    public function test_dashboard_total_orders_excludes_cancelled(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();

        $this->order($buyer, 'COMPLETED', '100.00');
        $this->order($buyer, 'CANCELLED', '200.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk();

        $this->assertSame(1, $response->json('data.total_orders'));
    }

    public function test_dashboard_total_revenue_excludes_cancelled(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();

        $this->order($buyer, 'COMPLETED', '150.00');
        $this->order($buyer, 'CANCELLED', '300.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk();

        $this->assertEquals(150.00, $response->json('data.total_revenue'));
    }

    public function test_dashboard_monthly_revenue_excludes_cancelled(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();

        $this->order($buyer, 'DELIVERED', '80.00');
        $this->order($buyer, 'CANCELLED', '500.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk();

        $this->assertEquals(80.00, $response->json('data.monthly_activity.revenue.current'));
    }

    public function test_dashboard_counts_completed_and_pending_orders(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();

        $this->order($buyer, 'PENDING', '10.00');
        $this->order($buyer, 'PLACED', '20.00');
        $this->order($buyer, 'DELIVERED', '30.00');
        $this->order($buyer, 'COMPLETED', '40.00');
        $this->order($buyer, 'CANCELLED', '999.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk();

        $this->assertSame(4, $response->json('data.total_orders'));
        $this->assertEquals(100.00, $response->json('data.total_revenue'));
    }

    // -------------------------------------------------------------------------
    // Report tests
    // -------------------------------------------------------------------------

    public function test_report_sales_summary_excludes_cancelled(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();

        $this->order($buyer, 'COMPLETED', '200.00');
        $this->order($buyer, 'CANCELLED', '999.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reports?period=month')
            ->assertOk();

        $this->assertSame(1, $response->json('data.sales_summary.total_orders'));
        $this->assertEquals(200.00, $response->json('data.sales_summary.total_revenue'));
    }

    public function test_report_daily_trend_excludes_cancelled(): void
    {
        $admin  = $this->admin();
        $buyer  = $this->buyer();
        $today  = Carbon::today()->format('Y-m-d');

        $this->order($buyer, 'CANCELLED', '500.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reports?period=today')
            ->assertOk();

        $trend = collect($response->json('data.sales_trend'));
        $todayEntry = $trend->firstWhere('date', $today);

        $this->assertNotNull($todayEntry);
        $this->assertSame(0, $todayEntry['orders']);
        $this->assertEquals(0, $todayEntry['total']);
    }

    public function test_report_counts_completed_order_in_sales_trend(): void
    {
        $admin = $this->admin();
        $buyer = $this->buyer();
        $today = Carbon::today()->format('Y-m-d');

        $this->order($buyer, 'COMPLETED', '75.00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reports?period=today')
            ->assertOk();

        $trend     = collect($response->json('data.sales_trend'));
        $todayEntry = $trend->firstWhere('date', $today);

        $this->assertNotNull($todayEntry);
        $this->assertSame(1, $todayEntry['orders']);
        $this->assertEquals(75.00, $todayEntry['total']);
    }
}

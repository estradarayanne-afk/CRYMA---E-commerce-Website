<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogisticsDashboardReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_aggregates_current_hub_and_transfer_lifecycle_without_confusing_departure_with_receipt(): void
    {
        $logistics = User::factory()->create(['role' => 'logistics', 'status' => 'active']);
        $origin = LogisticsHub::create(['name' => 'Origin', 'code' => 'ORIGIN', 'is_active' => false]);
        $destination = LogisticsHub::create(['name' => 'Destination', 'code' => 'DEST', 'is_active' => true]);
        $order = Order::create(['buyer_id' => User::factory()->create(['role' => 'buyer', 'status' => 'active'])->id, 'delivery_address' => 'Private address', 'payment_method' => 'cash_on_delivery', 'subtotal' => 100, 'shipping_fee' => 0, 'total_amount' => 100, 'status' => Delivery::AT_SORTING_CENTER]);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $origin->id]);
        $assigned = HubTransfer::create(['delivery_id' => $delivery->id, 'from_hub_id' => $origin->id, 'to_hub_id' => $destination->id, 'status' => 'assigned']);
        $inTransit = HubTransfer::create(['delivery_id' => $delivery->id, 'from_hub_id' => $origin->id, 'to_hub_id' => $destination->id, 'status' => 'in_transit', 'departed_at' => now()]);
        $arrived = HubTransfer::create(['delivery_id' => $delivery->id, 'from_hub_id' => $origin->id, 'to_hub_id' => $destination->id, 'status' => 'arrived', 'departed_at' => now()->subHour(), 'arrived_at' => now()]);
        DeliveryEvent::create(['delivery_id' => $delivery->id, 'actor_id' => null, 'event_type' => 'hub_transfer_departed', 'new_status' => Delivery::AT_SORTING_CENTER, 'created_at' => now()]);

        $response = $this->actingAs($logistics, 'sanctum')->getJson('/api/logistics/dashboard')->assertOk();
        $originRow = collect($response->json('data.hubs'))->firstWhere('code', 'ORIGIN');
        $response->assertJsonPath('data.transfers_awaiting_dispatch', 1)
            ->assertJsonPath('data.transfers_in_transit_awaiting_receipt', 1)
            ->assertJsonPath('data.completed_transfers', 1)
            ->assertJsonPath('data.recent_events.data.0.actor_recorded', false);
        $this->assertFalse($originRow['is_active']);
        $this->assertSame(1, $originRow['deliveries_count']);
        $this->assertSame(0, $originRow['incoming_transfers_awaiting_receipt']);
        $this->assertSame($assigned->id, $response->json('data.transfers.2.id'));
        $this->assertSame($inTransit->id, $response->json('data.transfers.1.id'));
        $this->assertSame($arrived->id, $response->json('data.transfers.0.id'));
        $this->assertStringNotContainsString('Private address', $response->getContent());
    }

    public function test_custom_period_validation_event_date_filter_and_csv_export_are_consistent(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 4)->setTime(12, 0));
        $logistics = User::factory()->create(['role' => 'logistics', 'status' => 'active']);
        $hub = LogisticsHub::create(['name' => '=Formula Hub', 'code' => 'FORMULA', 'is_active' => false]);
        $order = Order::create(['buyer_id' => User::factory()->create(['role' => 'buyer', 'status' => 'active'])->id, 'delivery_address' => 'Address not exported', 'payment_method' => 'cash_on_delivery', 'subtotal' => 25, 'shipping_fee' => 0, 'total_amount' => 25, 'status' => Delivery::DELIVERED]);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::DELIVERED]);
        DeliveryEvent::create(['delivery_id' => $delivery->id, 'event_type' => 'delivery_completed', 'new_status' => Delivery::DELIVERED, 'created_at' => '2026-11-04 10:00:00']);
        DeliveryEvent::create(['delivery_id' => $delivery->id, 'event_type' => 'old_event', 'new_status' => Delivery::DELIVERED, 'created_at' => '2026-10-01 10:00:00']);

        $this->actingAs($logistics, 'sanctum')->getJson('/api/logistics/dashboard?period=custom&from=2026-11-04&to=2026-11-04')
            ->assertOk()->assertJsonPath('data.reports.deliveries_created_by_current_status.0.total', 1)
            ->assertJsonPath('data.reports.events_recorded_by_type.0.event_type', 'delivery_completed');
        $this->getJson('/api/logistics/dashboard?period=custom&from=2026-11-05&to=2026-11-04')->assertUnprocessable();
        $this->getJson('/api/logistics/reports/export?report=hubs&period=all')->assertOk();
        $csv = $this->get('/api/logistics/reports/export?report=hubs&period=all');
        $csv->assertOk();
        $this->assertStringContainsString("'=Formula Hub", $csv->streamedContent());
        $this->assertStringNotContainsString('Address not exported', $csv->streamedContent());
    }

    public function test_only_logistics_can_access_dashboard_and_report_exports(): void
    {
        foreach (['buyer', 'seller', 'rider', 'admin'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum')->getJson('/api/logistics/dashboard')->assertForbidden();
            $this->getJson('/api/logistics/reports/export?report=events&period=all')->assertForbidden();
        }
    }
}

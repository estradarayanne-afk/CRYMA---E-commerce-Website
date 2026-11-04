<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $filters = $this->filters($request);
        $counts = [
            'pickups_awaiting_assignment' => Order::where('status', 'READY_FOR_PICKUP')
                ->whereDoesntHave('pickupAssignment')
                ->where(fn ($query) => $query->whereDoesntHave('delivery')->orWhereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)->where('status', 'READY_FOR_PICKUP')))->count(),
            'incoming_parcels' => Delivery::where('status', Delivery::PICKED_UP)->count(),
            'parcels_awaiting_sorting' => Delivery::where('status', Delivery::AT_SORTING_CENTER)->count(),
            'parcels_ready_for_dispatch' => Delivery::where('status', Delivery::SORTED)->count(),
            'parcels_assigned_for_final_mile' => Delivery::where('status', Delivery::ASSIGNED)->count(),
            'deliveries_in_progress' => Delivery::where('status', Delivery::OUT_FOR_DELIVERY)->count(),
            'completed_deliveries' => Delivery::whereIn('status', [Delivery::DELIVERED, Delivery::COMPLETED])->count(),
            'failed_deliveries' => Delivery::where('status', Delivery::FAILED)->count(),
        ];

        $hubs = LogisticsHub::query()->withCount('deliveries')
            ->withCount(['incomingTransfers as incoming_transfers_awaiting_receipt' => fn (Builder $q) => $q->where('status', 'in_transit')])
            ->withCount(['outgoingTransfers as outgoing_transfers_awaiting_dispatch' => fn (Builder $q) => $q->where('status', 'assigned')])
            ->withCount(['outgoingTransfers as outgoing_transfers_in_transit' => fn (Builder $q) => $q->where('status', 'in_transit')])
            ->orderBy('name')->get(['id', 'name', 'code', 'is_active']);

        $transferCounts = HubTransfer::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status');
        $transfers = HubTransfer::with(['fromHub:id,name,code', 'toHub:id,name,code', 'delivery:id,parcel_code', 'returnShipment:id,order_id'])
            ->orderByDesc('created_at')->orderByDesc('id')->limit(10)->get()->map(fn (HubTransfer $transfer) => [
                'id' => $transfer->id,
                'parcel_reference' => $transfer->delivery?->parcel_code ?? ($transfer->returnShipment ? 'Return #'.$transfer->returnShipment->id : 'Transfer #'.$transfer->id),
                'from_hub' => $transfer->fromHub?->name,
                'to_hub' => $transfer->toHub?->name,
                'status' => $transfer->status,
                'latest_activity_at' => $transfer->arrived_at ?? $transfer->departed_at ?? $transfer->updated_at,
                'created_at' => $transfer->created_at,
                'departed_at' => $transfer->departed_at,
                'arrived_at' => $transfer->arrived_at,
            ]);

        $eventQuery = $this->applyDates(DeliveryEvent::query()->with([
            'delivery:id,parcel_code,current_hub_id', 'delivery.currentHub:id,name,code', 'actor:id,first_name,last_name',
        ]), 'created_at', $filters);
        $events = $eventQuery->orderByDesc('created_at')->orderByDesc('id')->paginate(20)->through(fn (DeliveryEvent $event) => [
            'id' => $event->id,
            'event_type' => $event->event_type,
            'parcel_reference' => $event->delivery?->parcel_code,
            'hub' => $event->delivery?->currentHub?->name,
            'actor' => $event->actor ? trim($event->actor->first_name.' '.$event->actor->last_name) : null,
            'actor_recorded' => $event->actor_id !== null,
            'created_at' => $event->created_at,
        ]);

        return response()->json(['success' => true, 'data' => [
            ...$counts,
            'transfers_awaiting_dispatch' => (int) ($transferCounts['assigned'] ?? 0),
            'transfers_in_transit_awaiting_receipt' => (int) ($transferCounts['in_transit'] ?? 0),
            'completed_transfers' => (int) ($transferCounts['arrived'] ?? 0),
            'hubs' => $hubs,
            'transfers' => $transfers,
            'recent_events' => $events,
            'reports' => $this->reportData($filters),
            'period' => $filters,
        ]]);
    }

    public function export(Request $request)
    {
        $filters = $this->filters($request);
        $validated = $request->validate(['report' => ['required', 'in:parcels,hubs,transfers,events']]);
        $report = $validated['report'];
        $rows = match ($report) {
            'parcels' => $this->parcelReport($filters)->map(fn ($row) => [$row->status, $row->total]),
            'hubs' => $this->hubReport()->map(fn ($row) => [$row->name, $row->is_active ? 'active' : 'inactive', $row->deliveries_count]),
            'transfers' => $this->transferReport($filters)->map(fn ($row) => [$row->from_hub, $row->to_hub, $row->status, $row->total]),
            default => $this->eventReport($filters)->map(fn ($row) => [$row->event_type, $row->total]),
        };

        return response()->streamDownload(function () use ($rows, $report) {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, match ($report) {
                'parcels' => ['Current delivery status', 'Delivery records created in period'],
                'hubs' => ['Hub', 'State', 'Current delivery records associated'],
                'transfers' => ['Origin hub', 'Destination hub', 'Transfer status', 'Transfers created in period'],
                default => ['Recorded event type', 'Events recorded in period'],
            });
            foreach ($rows as $row) fputcsv($stream, array_map(fn ($value) => $this->csvSafe($value), $row));
            fclose($stream);
        }, 'logistics-'.$report.'-report.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filters(Request $request): array
    {
        $values = $request->validate([
            'period' => ['sometimes', 'in:today,last_7_days,last_30_days,custom,all'],
            'from' => ['required_if:period,custom', 'nullable', 'date_format:Y-m-d'],
            'to' => ['required_if:period,custom', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $period = $values['period'] ?? 'last_7_days';
        $today = now()->toDateString();
        [$from, $to] = match ($period) {
            'today' => [$today, $today],
            'last_7_days' => [now()->subDays(6)->toDateString(), $today],
            'last_30_days' => [now()->subDays(29)->toDateString(), $today],
            'custom' => [$values['from'], $values['to']],
            default => [null, null],
        };
        return ['period' => $period, 'from' => $from, 'to' => $to, 'page' => (int) ($values['page'] ?? 1)];
    }

    private function applyDates(Builder $query, string $column, array $filters): Builder
    {
        if ($filters['from']) $query->whereDate($column, '>=', $filters['from']);
        if ($filters['to']) $query->whereDate($column, '<=', $filters['to']);
        return $query;
    }

    private function parcelReport(array $filters)
    {
        return $this->applyDates(Delivery::query(), 'created_at', $filters)->select('status', DB::raw('count(*) as total'))->groupBy('status')->orderBy('status')->get();
    }

    private function transferReport(array $filters)
    {
        return $this->applyDates(HubTransfer::query()->leftJoin('logistics_hubs as origins', 'hub_transfers.from_hub_id', '=', 'origins.id')->leftJoin('logistics_hubs as destinations', 'hub_transfers.to_hub_id', '=', 'destinations.id'), 'hub_transfers.created_at', $filters)
            ->select('origins.name as from_hub', 'destinations.name as to_hub', 'hub_transfers.status', DB::raw('count(*) as total'))
            ->groupBy('origins.name', 'destinations.name', 'hub_transfers.status')->orderBy('origins.name')->orderBy('destinations.name')->orderBy('hub_transfers.status')->get();
    }

    private function eventReport(array $filters)
    {
        return $this->applyDates(DeliveryEvent::query(), 'created_at', $filters)->select('event_type', DB::raw('count(*) as total'))->groupBy('event_type')->orderBy('event_type')->get();
    }

    private function reportData(array $filters): array
    {
        $parcelStatuses = $this->parcelReport($filters)->map(fn ($row) => ['status' => $row->status, 'total' => (int) $row->total]);
        $hubs = $this->hubReport()->map(fn ($hub) => ['id' => $hub->id, 'name' => $hub->name, 'is_active' => (bool) $hub->is_active, 'deliveries_count' => (int) $hub->deliveries_count]);
        $transfers = $this->transferReport($filters)->map(fn ($row) => ['from_hub' => $row->from_hub, 'to_hub' => $row->to_hub, 'status' => $row->status, 'total' => (int) $row->total]);
        $events = $this->eventReport($filters)->map(fn ($row) => ['event_type' => $row->event_type, 'total' => (int) $row->total]);
        return ['deliveries_created_by_current_status' => $parcelStatuses, 'current_delivery_records_by_hub' => $hubs, 'transfers_created_by_route_and_status' => $transfers, 'events_recorded_by_type' => $events];
    }

    private function hubReport()
    {
        return LogisticsHub::withCount('deliveries')->orderBy('name')->get(['id', 'name', 'is_active']);
    }

    private function csvSafe(mixed $value): string
    {
        $value = (string) ($value ?? '');
        return preg_match('/^[\s]*[=+@\-]/u', $value) ? "'".$value : $value;
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Commission;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->get('period', 'month');

        /*
        |--------------------------------------------------------------------------
        | REPORTING PERIOD
        |--------------------------------------------------------------------------
        */

        $today = Carbon::today();

        switch ($period) {

            case 'today':
                $from = $today->copy()->startOfDay();
                $to = $today->copy()->endOfDay();
                break;

            case 'week':
                $from = $today->copy()->startOfWeek();
                $to = $today->copy()->endOfWeek();
                break;

            case 'year':
                $from = $today->copy()->startOfYear();
                $to = $today->copy()->endOfYear();
                break;

            case 'custom':
                $from = $request->filled('from')
                    ? Carbon::parse($request->from)->startOfDay()
                    : $today->copy()->startOfMonth();

                $to = $request->filled('to')
                    ? Carbon::parse($request->to)->endOfDay()
                    : $today->copy()->endOfDay();
                break;

            case 'month':
            default:
                $from = $today->copy()->startOfMonth();
                $to = $today->copy()->endOfMonth();
                $period = 'month';
                break;
        }

        /*
        |--------------------------------------------------------------------------
        | SALES SUMMARY
        |--------------------------------------------------------------------------
        */

        $orders = Order::whereBetween('created_at', [$from, $to]);

        $salesSummary = [
            'total_orders' => (clone $orders)->count(),

            'total_sales' => (clone $orders)->sum('subtotal'),

            'total_shipping' => (clone $orders)->sum('shipping_fee'),

            'total_revenue' => (clone $orders)->sum('total_amount'),
        ];

        /*
        |--------------------------------------------------------------------------
        | COMMISSION REPORT
        |--------------------------------------------------------------------------
        */

        $commissions = Commission::whereBetween(
            'created_at',
            [$from, $to]
        );

        $commissionReport = [
            'total_records' => (clone $commissions)->count(),

            'total_commission' => (clone $commissions)
                ->sum('commission_amount'),

            'total_seller_earnings' => (clone $commissions)
                ->sum('seller_earnings'),
        ];

        /*
        |--------------------------------------------------------------------------
        | SALES TREND
        |--------------------------------------------------------------------------
        */

        $salesTrend = [];

        $currentDate = $from->copy()->startOfDay();

        while ($currentDate <= $to) {

            $dayStart = $currentDate->copy()->startOfDay();
            $dayEnd = $currentDate->copy()->endOfDay();

            $dayOrders = Order::whereBetween(
                'created_at',
                [$dayStart, $dayEnd]
            );

            $salesTrend[] = [
                'date' => $currentDate->format('Y-m-d'),

                'total' => (clone $dayOrders)
                    ->sum('subtotal'),

                'orders' => (clone $dayOrders)
                    ->count(),
            ];

            $currentDate->addDay();
        }

        /*
        |--------------------------------------------------------------------------
        | COMMISSION TREND
        |--------------------------------------------------------------------------
        */

        $commissionTrend = [];

        $currentDate = $from->copy()->startOfDay();

        while ($currentDate <= $to) {

            $dayStart = $currentDate->copy()->startOfDay();
            $dayEnd = $currentDate->copy()->endOfDay();

            $dayCommissions = Commission::whereBetween(
                'created_at',
                [$dayStart, $dayEnd]
            );

            $commissionTrend[] = [
                'date' => $currentDate->format('Y-m-d'),

                'commission' => (clone $dayCommissions)
                    ->sum('commission_amount'),

                'earnings' => (clone $dayCommissions)
                    ->sum('seller_earnings'),
            ];

            $currentDate->addDay();
        }

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,

            'data' => [

                'period' => $period,

                'date_range' => [
                    'from' => $from->format('Y-m-d'),
                    'to' => $to->format('Y-m-d'),
                ],

                'sales_summary' => $salesSummary,

                'sales_trend' => $salesTrend,

                'commission_report' => $commissionReport,

                'commission_trend' => $commissionTrend,
            ],
        ]);
    }
}
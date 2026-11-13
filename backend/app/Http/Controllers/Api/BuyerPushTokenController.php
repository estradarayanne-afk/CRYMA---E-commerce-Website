<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuyerPushToken;
use Illuminate\Http\Request;

class BuyerPushTokenController extends Controller
{
    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403, 'Only buyers can register push notifications.');

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'in:android,ios'],
        ]);

        BuyerPushToken::updateOrCreate(
            ['token' => $validated['token']],
            ['user_id' => $request->user()->id, 'platform' => $validated['platform']]
        );

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403, 'Only buyers can unregister push notifications.');

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);

        BuyerPushToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token', $validated['token'])
            ->delete();

        return response()->json(['success' => true]);
    }
}

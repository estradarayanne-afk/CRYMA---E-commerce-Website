<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use App\Models\Order;
use App\Observers\OrderObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Order::observe(OrderObserver::class);
        $publicApiHost = request()->getHost() === 'api.cryma.store';
        if ($publicApiHost) {
            URL::forceScheme('https');
            Paginator::currentPathResolver(
                fn (): string => 'https://api.cryma.store/'.ltrim(request()->path(), '/'),
            );
        } elseif (
            $this->app->environment('production')
            && parse_url((string) config('app.url'), PHP_URL_SCHEME) === 'https'
        ) {
            URL::forceScheme('https');
        }

        ResetPassword::createUrlUsing(function ($user, string $token): string {
            return rtrim((string) config('app.frontend_url'), '/') . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);
        });
    }
}

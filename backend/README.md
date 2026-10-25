<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## Local MySQL development

MySQL Workbench is a database client. The application connects to a MySQL Server, which can be the local server managed through Workbench.

The PHP CLI used for Laravel must have `pdo_mysql` enabled. On Windows, run `php --ini` to locate `php.ini`, enable `extension=pdo_mysql`, and confirm it with `php --ri pdo_mysql`. Restart the terminal and backend after changing the extension.

1. In Workbench, connect to your local MySQL Server and run this once to create a dedicated development database account:

   ```sql
   CREATE DATABASE ecommerce_system
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   CREATE USER 'ecommerce_dev'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
   GRANT ALL PRIVILEGES ON ecommerce_system.* TO 'ecommerce_dev'@'127.0.0.1';
   ```

   Use a unique local password and do not commit it or share it in chat.

2. Copy `.env.example` to `.env` if needed. Set `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, and `DB_USERNAME` to match the local server, and set `DB_PASSWORD` to the password you chose. `.env` is ignored by Git. If your server requires TLS, set `MYSQL_ATTR_SSL_CA` to its CA certificate path.

3. From this directory, create/update the schema and load development fixtures:

   ```powershell
   php artisan migrate --seed
   ```

   `migrate` creates the schema from versioned migration files. `--seed` adds synthetic development accounts and sample products; seeders are restricted to local/development/testing environments. Do not use development seed credentials in production.

4. Open the same MySQL Server connection in Workbench and select the `ecommerce_system` schema to browse the app's tables and local data.

### Sharing setup with teammates

Commit and pull migrations and seeders through Git; each developer creates a separate local database and runs `php artisan migrate --seed`. Do not commit `.env`, SQL dumps of real data, credentials, or customer records. Migrations and seeders share the database structure and synthetic fixtures, not live database contents. To share real data, use an explicitly approved, access-controlled backup process with sensitive data removed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

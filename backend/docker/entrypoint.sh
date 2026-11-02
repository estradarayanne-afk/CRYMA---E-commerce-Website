#!/bin/sh
set -eu

if [ "${CRYMA_REQUIRE_EXISTING_DB:-0}" = "1" ]; then
    db_path="${DB_DATABASE:-/data/database.sqlite}"
    marker=/var/www/storage/.cryma-storage-verified
    expected_manifest="${CRYMA_STORAGE_MANIFEST_SHA256:-}"

    if [ "$db_path" != "/data/database.sqlite" ] || [ ! -f "$db_path" ]; then
        echo "Required existing SQLite database is missing or mounted at the wrong path." >&2
        exit 1
    fi
    if [ ! -r "$db_path" ] || [ ! -w "$db_path" ] || [ ! -w /data ]; then
        echo "SQLite database or volume is not readable/writable by the app user." >&2
        exit 1
    fi

    migration_table="$(sqlite3 -readonly "$db_path" "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='migrations');")"
    if [ "$migration_table" != "1" ]; then
        echo "Mounted SQLite database is invalid or has no Laravel migration history." >&2
        exit 1
    fi

    if [ -z "$expected_manifest" ] || [ ! -f "$marker" ]; then
        echo "Persistent storage has not been verified for this release." >&2
        exit 1
    fi
    actual_manifest="$(cat "$marker" | tr -d '\r\n')"
    if [ "$actual_manifest" != "$expected_manifest" ]; then
        echo "Mounted storage volume does not match the verified storage manifest." >&2
        exit 1
    fi

    for path in /var/www/storage/app/private /var/www/storage/app/public /var/www/storage/framework /var/www/storage/logs; do
        if [ ! -d "$path" ] || [ ! -w "$path" ]; then
            echo "Persistent Laravel storage path is missing or not writable: $path" >&2
            exit 1
        fi
    done
fi

exec "$@"
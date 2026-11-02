#!/usr/bin/env python3
"""Synthetic-only regression tests for sanitize_rehearsal_db.py; uses fictional data."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

SANITIZER = Path(__file__).with_name("sanitize_rehearsal_db.py")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_db(path: Path, *, duplicate_commission: bool = False, unknown_sensitive: bool = False, generated_sensitive: bool = False, trigger: bool = False, transaction_failure: bool = False) -> None:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
      CREATE TABLE migrations (id INTEGER PRIMARY KEY, migration TEXT NOT NULL, batch INTEGER NOT NULL);
      CREATE TABLE users (
        id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, middle_name TEXT, last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE, phone TEXT, password TEXT NOT NULL, remember_token TEXT,
        role TEXT NOT NULL, status TEXT NOT NULL, email_otp_hash TEXT, email_otp_expires_at TEXT,
        email_otp_attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE seller_profiles (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id), business_name TEXT NOT NULL,
        tin TEXT, birthday TEXT NOT NULL, sex TEXT NOT NULL, store_slug TEXT UNIQUE, storefront_settings TEXT,
        requested_business_name TEXT, business_name_request_status TEXT, business_name_requested_at TEXT,
        business_name_reviewed_at TEXT, business_name_reviewed_by INTEGER REFERENCES users(id), business_name_request_reason TEXT
      );
      CREATE TABLE addresses (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), province TEXT NOT NULL,
        municipality TEXT NOT NULL, barangay TEXT NOT NULL, street TEXT, recipient_name TEXT, phone TEXT
      );
      CREATE TABLE products (id INTEGER PRIMARY KEY, seller_id INTEGER NOT NULL REFERENCES users(id), name TEXT, price NUMERIC NOT NULL, stock INTEGER NOT NULL);
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY, buyer_id INTEGER NOT NULL REFERENCES users(id), delivery_address TEXT,
        subtotal NUMERIC NOT NULL, shipping_fee NUMERIC NOT NULL, total_amount NUMERIC NOT NULL, status TEXT NOT NULL
      );
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id),
        seller_id INTEGER NOT NULL REFERENCES users(id), quantity INTEGER NOT NULL, unit_price NUMERIC NOT NULL, subtotal NUMERIC NOT NULL
      );
      CREATE INDEX order_items_seller_order_idx ON order_items(seller_id, order_id);
      CREATE TABLE order_item_tags (
        order_item_id INTEGER NOT NULL REFERENCES order_items(id), tag TEXT NOT NULL,
        PRIMARY KEY(order_item_id, tag)
      ) WITHOUT ROWID;
      CREATE TABLE commissions (
        id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), seller_id INTEGER NOT NULL REFERENCES users(id),
        order_amount NUMERIC NOT NULL, commission_rate NUMERIC NOT NULL, commission_amount NUMERIC NOT NULL,
        seller_earnings NUMERIC NOT NULL, payout_amount NUMERIC, status TEXT NOT NULL
      );
      CREATE TABLE conversations (id INTEGER PRIMARY KEY, buyer_id INTEGER NOT NULL REFERENCES users(id));
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id), sender_id INTEGER NOT NULL REFERENCES users(id),
        message TEXT NOT NULL, attachment_path TEXT, attachment_name TEXT
      );
      CREATE TABLE user_documents (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), document_type TEXT NOT NULL,
        file_path TEXT NOT NULL, original_file_name TEXT, mime_type TEXT, status TEXT NOT NULL, rejection_reason TEXT
      );
      CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id), ip_address TEXT, user_agent TEXT, payload TEXT);
      CREATE TABLE personal_access_tokens (
        id INTEGER PRIMARY KEY, tokenable_type TEXT NOT NULL, tokenable_id INTEGER NOT NULL,
        name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, abilities TEXT
      );
      CREATE TABLE password_reset_tokens (email TEXT PRIMARY KEY, token TEXT NOT NULL, created_at TEXT);
    """)
    db.executemany("INSERT INTO migrations VALUES (?, ?, ?)", [
        (1, "2026_10_30_000001_add_store_category_to_products", 4),
        (2, "2026_10_30_000002_add_product_drafts", 5),
    ])
    db.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (11, "FictionalAlice", None, "Example", "alice@example.invalid", "555-0101", "fake-password-hash-A", "fake-remember-A", "buyer", "active", "fake-otp-A", "2030-01-01", 2),
        (12, "FictionalSeller", "Q", "Example", "seller@example.invalid", "555-0102", "fake-password-hash-B", "fake-remember-B", "seller", "active", None, None, 0),
    ])
    db.execute("INSERT INTO seller_profiles VALUES (21, 12, 'Fictional Corner Shop', 'FAKE-TIN-0001', '1990-02-03', 'female', 'fictional-corner', '{\"contact\":\"fake\"}', ?, 'pending', '2026-01-01', NULL, NULL, 'Fictional request note')", ('Fictional Corner Shop',))
    db.execute("INSERT INTO addresses VALUES (31, 11, 'Fictional Province', 'Example City', 'Sample Barangay', 'Mock Street 5', 'FictionalAlice', '555-0101')")
    db.execute("INSERT INTO products VALUES (41, 12, 'Fictional Widget', 100.00, 7)")
    db.executemany("INSERT INTO orders VALUES (?, 11, ?, ?, 0, ?, 'completed')", [
        (51, "Fictional Address One", 100.00, 100.00),
        (52, "Fictional Address Two", 50.00, 50.00),
    ])
    db.executemany("INSERT INTO order_items VALUES (?, ?, 41, 12, 1, ?, ?)", [(61, 51, 100.00, 100.00), (62, 52, 50.00, 50.00)])
    db.execute("INSERT INTO order_item_tags VALUES (61, 'fictional-tag')")
    db.executemany("INSERT INTO commissions VALUES (?, ?, 12, ?, 10, ?, ?, NULL, 'available')", [
        (71, 51, 100.00, 10.00, 90.00), (72, 52, 50.00, 5.00, 45.00),
    ])
    if duplicate_commission:
        db.execute("INSERT INTO commissions VALUES (73, 51, 12, 100, 10, 10, 90, NULL, 'pending')")
    db.execute("INSERT INTO conversations VALUES (81, 11)")
    db.execute("INSERT INTO messages VALUES (91, 81, 11, 'Fictional private message', '/private/fake/message.pdf', 'FictionalAlice-message.pdf')")
    db.execute("INSERT INTO user_documents VALUES (101, 11, 'valid_id', '/private/fake/id.pdf', 'FictionalAlice-ID.pdf', 'application/pdf', 'pending', 'Fictional review note')")
    db.execute("INSERT INTO sessions VALUES ('fictional-session-id', 11, '192.0.2.10', 'Fake Browser Agent', 'session contains fictional contact data')")
    db.execute("INSERT INTO personal_access_tokens VALUES (111, 'App\\Models\\User', 11, 'Fictional token label', ?, 'read')", ("a" * 64,))
    db.execute("INSERT INTO password_reset_tokens VALUES ('alice@example.invalid', 'fictional-reset-token', '2026-01-01')")
    if unknown_sensitive:
        db.execute("CREATE TABLE applicant_data (id INTEGER PRIMARY KEY, secondary_phone_extension TEXT)")
        db.execute("INSERT INTO applicant_data VALUES (121, 'fictional-private-value')")
    if generated_sensitive:
        db.execute("CREATE TABLE generated_profiles (id INTEGER PRIMARY KEY, email_source TEXT, contact_email TEXT GENERATED ALWAYS AS (email_source) STORED)")
        db.execute("INSERT INTO generated_profiles(id,email_source) VALUES (131,'generated@example.invalid')")
    if trigger:
        db.execute("CREATE TABLE trigger_audit (id INTEGER PRIMARY KEY, marker TEXT)")
        db.execute("CREATE TRIGGER fictional_trigger AFTER UPDATE ON users BEGIN INSERT INTO trigger_audit(marker) VALUES ('fictional'); END")
    if transaction_failure:
        db.execute("CREATE TABLE constraint_probe (id INTEGER PRIMARY KEY, phone TEXT CHECK(phone = 'fictional-original'))")
        db.execute("INSERT INTO constraint_probe VALUES (1, 'fictional-original')")
    db.commit()
    db.close()


def run(source: Path, output: Path, report: Path, *flags: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SANITIZER), "--source-backup", str(source), "--output-copy", str(output), "--report", str(report), *flags],
        text=True, capture_output=True, check=False,
    )


def assert_clean_output(source: Path, output: Path, report_path: Path) -> dict:
    assert source.exists() and output.exists() and report_path.exists()
    src, dst = sqlite3.connect(source), sqlite3.connect(output)
    assert dst.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert dst.execute("PRAGMA foreign_key_check").fetchall() == []
    assert src.execute("SELECT id,migration,batch FROM migrations ORDER BY id").fetchall() == dst.execute("SELECT id,migration,batch FROM migrations ORDER BY id").fetchall()
    assert src.execute("SELECT id FROM orders ORDER BY id").fetchall() == dst.execute("SELECT id FROM orders ORDER BY id").fetchall()
    assert src.execute("SELECT order_item_id,tag FROM order_item_tags ORDER BY order_item_id,tag").fetchall() == dst.execute("SELECT order_item_id,tag FROM order_item_tags ORDER BY order_item_id,tag").fetchall()
    assert src.execute("SELECT id,order_id,seller_id,order_amount,commission_rate,commission_amount,seller_earnings,payout_amount,status FROM commissions ORDER BY id").fetchall() == dst.execute("SELECT id,order_id,seller_id,order_amount,commission_rate,commission_amount,seller_earnings,payout_amount,status FROM commissions ORDER BY id").fetchall()
    for table in ("users", "seller_profiles", "addresses", "products", "orders", "order_items", "order_item_tags", "commissions", "conversations", "messages", "user_documents", "sessions", "personal_access_tokens"):
        assert src.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone() == dst.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone(), table
        source_ids = src.execute(f'SELECT id FROM "{table}" ORDER BY id').fetchall() if table != "order_item_tags" else src.execute('SELECT order_item_id,tag FROM order_item_tags ORDER BY order_item_id,tag').fetchall()
        dest_ids = dst.execute(f'SELECT id FROM "{table}" ORDER BY id').fetchall() if table != "order_item_tags" else dst.execute('SELECT order_item_id,tag FROM order_item_tags ORDER BY order_item_id,tag').fetchall()
        assert source_ids == dest_ids, table
    # Sensitive fields and all listed file references have deterministic redaction markers.
    assert dst.execute("SELECT email,first_name,last_name,phone,password,remember_token,email_otp_hash FROM users WHERE id=11").fetchone()[0].endswith("@example.invalid")
    user = dst.execute("SELECT first_name,last_name,phone,password,remember_token,email_otp_hash FROM users WHERE id=11").fetchone()
    assert user[0].startswith("Sanitized-") and user[1].startswith("Sanitized-") and user[2].startswith("555-")
    assert user[3] == "!sanitized-disabled!" and user[4] is None and user[5] is None
    assert dst.execute("SELECT tin FROM seller_profiles").fetchone()[0] is None
    assert dst.execute("SELECT message,attachment_path,attachment_name FROM messages").fetchone()[0] == "[sanitized text]"
    assert dst.execute("SELECT file_path,original_file_name,rejection_reason FROM user_documents").fetchone()[0].startswith("sanitized/")
    assert dst.execute("SELECT payload,ip_address,user_agent FROM sessions").fetchone()[0] == "{}"
    assert dst.execute("SELECT COUNT(*) FROM password_reset_tokens").fetchone()[0] == 0
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["migration_ready"] is True, report["blockers"]
    assert report["source_unchanged"] is True
    assert report["validation"]["business_primary_keys_preserved"] is True
    assert report["validation"]["individual_financial_records_preserved"] is True
    assert report["validation"]["order_and_foreign_key_relationships_preserved"] is True
    assert report["validation"]["schema_and_indexes_preserved"] is True
    report_text = report_path.read_text(encoding="utf-8")
    for private in ("FictionalAlice", "alice@example.invalid", "FAKE-TIN-0001", "Fictional private message", "/private/fake"):
        assert private not in report_text
    src.close(); dst.close()
    return report


def main() -> int:
    passed = []
    with tempfile.TemporaryDirectory(prefix="cryma-sanitize-synthetic-") as temp:
        root = Path(temp)
        flags = ("--confirm-verified-backup", "--confirm-transient-purge")

        source = root / "synthetic-source.sqlite"
        output, report = root / "synthetic-sanitized.sqlite", root / "synthetic-report.json"
        make_db(source)
        original_hash = sha(source)
        proc = run(source, output, report, *flags)
        assert proc.returncode == 0, proc.stderr + proc.stdout
        assert sha(source) == original_hash
        good_report = assert_clean_output(source, output, report)
        assert good_report["purged_transient_tables"]["password_reset_tokens"] == 1
        passed.append("success, source immutability, output integrity, FKs, indexes, composite PKs, migration history, relationships, financial rows, PII-free report")

        wal_live = root / "synthetic-live-wal.sqlite"
        wal_copy = root / "synthetic-online-backup.sqlite"
        make_db(wal_live)
        live = sqlite3.connect(wal_live)
        assert live.execute("PRAGMA journal_mode=WAL").fetchone()[0].lower() == "wal"
        live.execute("PRAGMA wal_autocheckpoint=0")
        live.execute("UPDATE orders SET status='fictional-wal-committed' WHERE id=51")
        live.commit()
        assert Path(str(wal_live) + "-wal").exists()
        backup = sqlite3.connect(wal_copy)
        live.backup(backup)
        backup.close()
        live.close()
        wal_copy_hash = sha(wal_copy)
        wal_out, wal_report = root / "wal-sanitized.sqlite", root / "wal-sanitized-report.json"
        proc = run(wal_copy, wal_out, wal_report, *flags)
        assert proc.returncode == 0, proc.stderr + proc.stdout
        wal_result = sqlite3.connect(wal_out)
        assert wal_result.execute("SELECT status FROM orders WHERE id=51").fetchone()[0] == "fictional-wal-committed"
        wal_result.close()
        assert sha(wal_copy) == wal_copy_hash
        passed.append("SQLite Online Backup API captures committed WAL changes; standalone backup sanitized without source mutation")

        duplicate_source = root / "synthetic-duplicate-commissions.sqlite"
        duplicate_output, duplicate_report = root / "duplicate-sanitized.sqlite", root / "duplicate-report.json"
        make_db(duplicate_source, duplicate_commission=True)
        duplicate_hash = sha(duplicate_source)
        proc = run(duplicate_source, duplicate_output, duplicate_report, *flags)
        assert proc.returncode == 2, proc.stdout + proc.stderr
        rep = json.loads(duplicate_report.read_text(encoding="utf-8"))
        assert rep["migration_ready"] is False
        assert rep["validation"]["duplicate_commission_order_count_before"] == 1
        assert rep["validation"]["duplicate_commission_order_count_after"] == 1
        dup_db = sqlite3.connect(duplicate_output)
        duplicate_rows = dup_db.execute("SELECT COUNT(*) FROM commissions WHERE order_id=51").fetchone()[0]
        dup_db.close()
        assert duplicate_rows == 2
        assert sha(duplicate_source) == duplicate_hash
        passed.append("duplicate commissions reported and retained; migration_ready blocked")

        unknown_source = root / "synthetic-unknown-sensitive.sqlite"
        unknown_output, unknown_report = root / "unknown-sanitized.sqlite", root / "unknown-report.json"
        make_db(unknown_source, unknown_sensitive=True)
        proc = run(unknown_source, unknown_output, unknown_report, *flags)
        assert proc.returncode == 2
        rep = json.loads(unknown_report.read_text(encoding="utf-8"))
        assert rep["migration_ready"] is False
        assert "applicant_data.secondary_phone_extension" in rep["validation"]["unreviewed_sensitive_columns"]
        passed.append("unknown sensitive-looking column blocks migration_ready")

        generated_source = root / "synthetic-generated-sensitive.sqlite"
        generated_output, generated_report = root / "generated-sanitized.sqlite", root / "generated-report.json"
        make_db(generated_source, generated_sensitive=True)
        proc = run(generated_source, generated_output, generated_report, *flags)
        assert proc.returncode == 2
        rep = json.loads(generated_report.read_text(encoding="utf-8"))
        assert rep["migration_ready"] is False
        assert any("generated_profiles.contact_email" in field for field in rep["validation"]["unreviewed_sensitive_columns"])
        passed.append("generated sensitive column detected via table_xinfo and blocks readiness")

        trigger_source = root / "synthetic-trigger.sqlite"
        trigger_output, trigger_report = root / "trigger-sanitized.sqlite", root / "trigger-report.json"
        make_db(trigger_source, trigger=True)
        trigger_hash = sha(trigger_source)
        proc = run(trigger_source, trigger_output, trigger_report, *flags)
        assert proc.returncode == 1 and "trigger review required" in proc.stderr
        assert sha(trigger_source) == trigger_hash and not trigger_output.exists()
        passed.append("trigger source refused without source mutation or final output")

        wal_source = root / "synthetic-wal.sqlite"
        make_db(wal_source)
        Path(str(wal_source) + "-wal").write_bytes(b"fictional wal marker")
        wal_hash = sha(wal_source)
        proc = run(wal_source, root / "wal-out.sqlite", root / "wal-report.json", *flags)
        assert proc.returncode == 2 and "WAL/SHM sidecars" in proc.stderr
        assert sha(wal_source) == wal_hash and not (root / "wal-out.sqlite").exists()
        passed.append("WAL-sidecar source refused safely")

        unsafe_source = root / "synthetic-unsafe.sqlite"
        make_db(unsafe_source)
        unsafe_hash = sha(unsafe_source)
        proc = run(unsafe_source, root / "unsafe-out.sqlite", root / "unsafe-report.json")
        assert proc.returncode == 2 and "confirm-verified-backup" in proc.stderr
        assert sha(unsafe_source) == unsafe_hash and not (root / "unsafe-out.sqlite").exists()
        passed.append("missing backup acknowledgement refused without output or source mutation")

        existing_source = root / "synthetic-existing-output.sqlite"
        make_db(existing_source)
        existing_hash = sha(existing_source)
        existing_out, existing_report = root / "already-there.sqlite", root / "existing-report.json"
        existing_out.write_text("preserve me", encoding="utf-8")
        proc = run(existing_source, existing_out, existing_report, *flags)
        assert proc.returncode == 2 and "must be new paths" in proc.stderr
        assert existing_out.read_text(encoding="utf-8") == "preserve me" and sha(existing_source) == existing_hash
        passed.append("existing output refused and preserved")

        failed_source = root / "synthetic-constraint-failure.sqlite"
        failed_output, failed_report = root / "failure-out.sqlite", root / "failure-report.json"
        make_db(failed_source, transaction_failure=True)
        failed_hash = sha(failed_source)
        proc = run(failed_source, failed_output, failed_report, *flags)
        assert proc.returncode == 1 and "Sanitization stopped safely" in proc.stderr
        assert sha(failed_source) == failed_hash and not failed_output.exists()
        passed.append("constraint failure rolls back copied database and leaves source untouched")

    print("Synthetic sanitization tests passed:")
    for result in passed: print(f"- {result}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

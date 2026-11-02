#!/usr/bin/env python3
"""Create a sanitized CRYMA rehearsal database from a verified SQLite backup.

The source is opened read-only. SQLite's backup API first creates a new temporary
copy; all sanitization runs only against that copy. This tool is not a substitute
for an approved backup, privacy review, or production migration rehearsal.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

TRANSIENT_TABLES = {"password_reset_tokens", "cache", "jobs", "job_batches", "failed_jobs"}
SENSITIVE_CANDIDATE = re.compile(
    r"(student|personal|government|national|passport|license|tax|tin|ssn|identity|identifier|credential|secret|token|password|email|phone|mobile|address|message|attachment|document|evidence|photo|signature|file|path|url|filename|comment|content|body|text|reference|birth|ip.?address|user.?agent|first_name|middle_name|last_name|full_name|recipient|name|gender|pronoun|account|setting|metadata|profile|details|info|data|dob|avatar|image)",
    re.I,
)
FINANCIAL = re.compile(
    r"(amount|price|subtotal|total|fee|earnings|commission|payout|collected|expected|discount|shipping|rate|quantity|stock|balance|refund|remit|revenue|sales|cost|cash|tax)",
    re.I,
)
SAFE_STRUCTURAL_NAMES = {
    "document_type", "tokenable_type", "notifiable_type", "email_verified_at",
    "user_id", "order_id", "product_id", "seller_id", "buyer_id", "courier_profile_id",
    "delivery_id", "conversation_id", "refund_request_id", "voucher_id", "tokenable_id",
    "current_hub_id", "hub_id", "assigned_by", "reviewed_by", "paid_by", "remitted_by",
    "actor_id", "admin_id", "complainant_id", "respondent_id", "sender_id", "notifiable_id",
    "replaces_document_id", "business_name_request_status", "business_name_requested_at", "business_name_reviewed_at", "business_name_reviewed_by", "previous_courier_profile_id", "from_hub_id", "to_hub_id",
    "pickup_courier_profile_id", "delivery_courier_profile_id",
}


def q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def digest(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def inventory(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in conn.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        name = row["name"]
        cols = [dict(c) for c in conn.execute(f"PRAGMA table_xinfo({q(name)})")]
        fks = [dict(fk) for fk in conn.execute(f"PRAGMA foreign_key_list({q(name)})")]
        indexes = []
        for idx in conn.execute(f"PRAGMA index_list({q(name)})"):
            idx = dict(idx)
            idx_name = idx["name"]
            indexes.append({
                "name": idx_name,
                "unique": idx["unique"],
                "origin": idx.get("origin"),
                "partial": idx.get("partial"),
                "sql": (conn.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name=?", (idx_name,)).fetchone() or [None])[0],
                "columns": [dict(c) for c in conn.execute(f"PRAGMA index_xinfo({q(idx_name)})")],
            })
        result[name] = {
            "sql": row["sql"], "columns": cols,
            "column_names": {c["name"].lower() for c in cols},
            "primary_key": [c["name"] for c in sorted(cols, key=lambda c: c["pk"]) if c["pk"]],
            "foreign_keys": fks, "indexes": sorted(indexes, key=lambda i: i["name"]),
        }
    return result


def schema_fingerprint(conn: sqlite3.Connection) -> str:
    rows = [tuple(r) for r in conn.execute(
        "SELECT type,name,tbl_name,sql FROM sqlite_master "
        "WHERE type IN ('table','index','trigger','view') AND name NOT LIKE 'sqlite_%' "
        "ORDER BY type,name"
    )]
    # Include index_xinfo so auto-index/unique details are captured as well as SQL DDL.
    inv = inventory(conn)
    index_data = {table: info["indexes"] for table, info in inv.items()}
    return digest({"sqlite_master": rows, "indexes": index_data})


def collect_fingerprints(conn: sqlite3.Connection, inv: dict[str, dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {"counts": {}, "primary_keys": {}, "relationships": {}, "financial_records": {}}
    for table, info in inv.items():
        qt, cols, pk = q(table), [c["name"] for c in info["columns"]], info["primary_key"]
        order = ",".join(q(c) for c in pk) or "rowid"
        result["counts"][table] = conn.execute(f"SELECT COUNT(*) FROM {qt}").fetchone()[0]
        result["primary_keys"][table] = digest([tuple(r) for r in conn.execute(f"SELECT {order} FROM {qt} ORDER BY {order}")])
        rel_cols = sorted({c for c in cols if c.lower().endswith("_id")} | {fk["from"] for fk in info["foreign_keys"]})
        fin_cols = sorted(c for c in cols if FINANCIAL.search(c) and c.lower() not in {"id", "created_at", "updated_at"})
        # Each fingerprint includes the row's PK and every FK/id reference, so equal
        # aggregate sums cannot conceal a changed order, seller, or commission row.
        if rel_cols:
            order_cols = pk or ["rowid"]
            projection = ",".join(q(c) for c in order_cols + rel_cols)
            order_by = ",".join(q(c) for c in order_cols)
            result["relationships"][table] = digest([tuple(r) for r in conn.execute(f"SELECT {projection} FROM {qt} ORDER BY {order_by}")])
        if fin_cols:
            order_cols = pk or ["rowid"]
            projection = ",".join(q(c) for c in order_cols + fin_cols)
            order_by = ",".join(q(c) for c in order_cols)
            result["financial_records"][table] = digest([tuple(r) for r in conn.execute(f"SELECT {projection} FROM {qt} ORDER BY {order_by}")])
    if "migrations" in inv:
        pk = inv["migrations"]["primary_key"]
        order = ",".join(q(c) for c in pk) or ",".join(q(c["name"]) for c in inv["migrations"]["columns"])
        result["migration_history"] = digest([tuple(r) for r in conn.execute(f"SELECT * FROM migrations ORDER BY {order}")])
    else:
        result["migration_history"] = None
    return result


def category(column: str) -> str | None:
    n = column.lower()
    if n in {"email", "email_address"}: return "email"
    if n in {"password", "remember_token", "token", "correction_token_hash", "email_otp_hash", "email_otp_expires_at", "correction_token_expires_at"} or "secret" in n: return "credential"
    if n == "email_otp_attempts": return "zero_counter"
    if n in {"first_name", "middle_name", "last_name", "full_name", "recipient_name", "recipient_full_name", "buyer_handover_name", "seller_received_name"}: return "person_name"
    if n in {"birthday", "birth_date", "date_of_birth", "dob"}: return "birthday"
    if n in {"sex", "gender"}: return "sex"
    if n in {"phone", "phone_number", "mobile", "mobile_number"} or n.endswith("_phone"): return "phone"
    if n in {"ip_address", "user_agent"}: return "network_metadata"
    if n in {"mime_type", "attachment_mime"} or n.endswith("_mime_type"): return "mime"
    if n in {"storefront_settings", "data", "payload", "settings"} or n.endswith("_settings"): return "json_text"
    if n in {"file_size", "email_otp_attempts"}: return "zero_counter"
    if n in {"tin", "tax_id", "student_id", "student_number", "personal_id", "personal_id_number", "government_id", "government_id_number", "national_id", "national_id_number", "passport_number", "license_number", "drivers_license_number", "id_number", "plate_number", "account_number", "bank_account_number", "routing_number"} or n.endswith("_tax_id") or n.endswith("_identifier"):
        return "personal_identifier"
    if n == "address" or n.endswith("_address") or n in {"province", "region", "municipality", "barangay", "street", "house_number", "building_name", "unit_number", "postal_code"}: return "address"
    if n in {"business_name", "requested_business_name", "line_of_business", "store_slug", "store_tagline", "store_description"}: return "business_text"
    if n in {"message", "subject", "description", "admin_notes", "review_note", "reason", "note", "rejection_reason", "business_name_request_reason", "abilities", "name", "comment", "comments", "content", "body", "text", "exception"} or n.endswith(("_note", "_reason", "_reference", "_description", "_comment")):
        return "free_text"
    if n in {"image", "avatar", "photo", "signature", "file", "file_name", "filename", "document_name", "document_filename", "attachment_filename", "file_path", "original_file_name", "attachment_path", "attachment_name", "photo_path", "signature_path", "evidence_path", "pickup_photo_path", "delivery_photo_path", "profile_image_path", "path", "store_logo_url", "store_banner_url"} or n.endswith(("_path", "_url", "_filename")):
        return "file_reference"
    return None


def replacement(table: str, column: str, cat: str, key: str, nullable: bool) -> Any:
    if cat in {"personal_identifier", "network_metadata", "credential"} and nullable: return None
    marker = hashlib.sha256(f"cryma-rehearsal|{table}|{column}|{key}".encode()).hexdigest()[:12]
    if cat == "email": return f"sanitized-{marker}@example.invalid"
    if cat == "credential": return "!sanitized-disabled!" if column.lower() == "password" else marker * 5 + marker[:4]
    if cat == "zero_counter": return 0
    if cat == "person_name": return f"Sanitized-{marker}"
    if cat == "birthday": return "2000-01-01"
    if cat == "sex": return "prefer_not_to_say"
    if cat == "phone": return f"555-{marker[:9]}"
    if cat == "mime": return "application/octet-stream"
    if cat == "json_text": return "{}"
    if cat == "file_reference": return f"sanitized/{table}-{column}-{marker}.redacted"
    if cat == "personal_identifier": return f"REDACTED-{marker}"
    if cat == "address": return f"Sanitized {column} {marker}"
    if cat == "business_text": return f"sanitized-{marker}" if column.lower() == "store_slug" else f"Sanitized {column} {marker}"
    if cat == "free_text": return "[sanitized text]"
    return None


def _nullable(info: dict[str, Any], column: str) -> bool:
    col = next(c for c in info["columns"] if c["name"] == column)
    return col["notnull"] == 0 and col["pk"] == 0


def _sanitize_column(conn: sqlite3.Connection, table: str, column: str, cat: str, info: dict[str, Any], report: dict[str, Any]) -> None:
    pk_cols = info["primary_key"]
    projection = ",".join(q(c) for c in pk_cols + [column]) if pk_cols else f"rowid AS __rehearsal_rowid__, {q(column)}"
    rows = list(conn.execute(f"SELECT {projection} FROM {q(table)}"))
    updated = 0
    for row in rows:
        if row[column] is None: continue
        keys = pk_cols or ["rowid"]
        vals = [row[k] for k in pk_cols] if pk_cols else [row["__rehearsal_rowid__"]]
        key = digest(vals)[:12]
        value = replacement(table, column, cat, key, _nullable(info, column))
        where = " AND ".join(f"{q(k)} IS ?" for k in keys)
        conn.execute(f"UPDATE {q(table)} SET {q(column)}=? WHERE {where}", [value, *vals])
        updated += 1
    report["sanitized_fields"].append({"table": table, "column": column, "category": cat, "non_null_rows_replaced": updated})


def _verify_sanitized_fields(conn: sqlite3.Connection, fields: list[dict[str, Any]], inv: dict[str, dict[str, Any]]) -> dict[str, int]:
    residual: dict[str, int] = {}
    for entry in fields:
        table, column, cat = entry["table"], entry["column"], entry["category"]
        info, bad = inv[table], 0
        pk_cols = info["primary_key"]
        projection = ",".join(q(c) for c in pk_cols + [column]) if pk_cols else f"rowid AS __rehearsal_rowid__, {q(column)}"
        for row in conn.execute(f"SELECT {projection} FROM {q(table)}"):
            current = row[column]
            if current is None: continue
            vals = [row[k] for k in pk_cols] if pk_cols else [row["__rehearsal_rowid__"]]
            expected = replacement(table, column, cat, digest(vals)[:12], _nullable(info, column))
            if current != expected: bad += 1
        residual[f"{table}.{column}"] = bad
    return residual


def table_fk_violations(conn: sqlite3.Connection) -> int:
    return sum(1 for _ in conn.execute("PRAGMA foreign_key_check"))


def duplicate_commission_orders(conn: sqlite3.Connection) -> int:
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "commissions" not in tables: return 0
    cols = {r[1].lower() for r in conn.execute("PRAGMA table_info('commissions')")}
    if "order_id" not in cols: return 0
    return sum(1 for _ in conn.execute("SELECT 1 FROM commissions GROUP BY order_id HAVING COUNT(*) > 1"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source-backup", required=True, type=Path, help="approved standalone backup; never a live DB path")
    ap.add_argument("--output-copy", required=True, type=Path, help="new sanitized copy path; must not exist")
    ap.add_argument("--report", required=True, type=Path, help="new JSON report path; must not exist")
    ap.add_argument("--confirm-verified-backup", action="store_true", help="confirm source is an approved, verified backup and not live storage")
    ap.add_argument("--confirm-transient-purge", action="store_true", help="approve purging reset/cache/queue rows from the copy")
    args = ap.parse_args()
    source, output, report_path = args.source_backup.resolve(), args.output_copy.resolve(), args.report.resolve()
    if not args.confirm_verified_backup: ap.error("refusing without --confirm-verified-backup")
    if not args.confirm_transient_purge: ap.error("refusing without --confirm-transient-purge")
    if not source.is_file() or len({source, output, report_path}) != 3: ap.error("source must be a file and all paths must differ")
    if output.exists() or report_path.exists(): ap.error("output and report must be new paths; existing files are never overwritten")
    if not output.parent.is_dir() or not report_path.parent.is_dir(): ap.error("output and report parent directories must already exist")
    if Path(str(source) + "-wal").exists() or Path(str(source) + "-shm").exists(): ap.error("source has WAL/SHM sidecars; obtain a standalone SQLite backup first")
    temp = output.with_name(output.name + ".sanitizing.tmp")
    if temp.exists(): ap.error("temporary output exists; inspect it manually; it will not be overwritten or deleted")
    source_hash_before = sha256_file(source)
    report: dict[str, Any] = {"tool": "sanitize_rehearsal_db.py", "source_file_name": source.name, "output_file_name": output.name, "source_sha256_before": source_hash_before, "inventory": {}, "sanitized_fields": [], "purged_transient_tables": {}, "validation": {}, "blockers": [], "personal_data_values_written_to_report": False}

    src = dst = None
    try:
        src = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
        src.row_factory = sqlite3.Row
        src.execute("PRAGMA query_only=ON")
        dst = sqlite3.connect(temp)
        dst.row_factory = sqlite3.Row
        src.backup(dst)
        src.close()
        src = None
        dst.execute("PRAGMA foreign_keys=ON")
        before_inv = inventory(dst)
        before = collect_fingerprints(dst, before_inv)
        schema_before = schema_fingerprint(dst)
        integrity_before = [r[0] for r in dst.execute("PRAGMA integrity_check")]
        fk_before = table_fk_violations(dst)
        duplicates_before = duplicate_commission_orders(dst)
        report["inventory"] = {t: {"columns": [c["name"] for c in i["columns"]], "primary_key_columns": i["primary_key"], "foreign_key_count": len(i["foreign_keys"]), "indexes": [{"name": x["name"], "unique": x["unique"], "origin": x["origin"], "columns": [c["name"] for c in x["columns"] if c["key"]]} for x in i["indexes"]], "rows_before": before["counts"][t]} for t, i in before_inv.items()}
        required = {"users", "products", "orders", "order_items", "commissions", "migrations"}
        missing = sorted(required - before_inv.keys())
        if missing: report["blockers"].append("required tables missing: " + ", ".join(missing))
        if integrity_before != ["ok"]: report["blockers"].append("source copy failed SQLite integrity_check")
        if fk_before: report["blockers"].append("source copy already has foreign-key violations")
        if any(r["sql"] is not None and r["sql"].lower().startswith("create virtual table") for r in dst.execute("SELECT sql FROM sqlite_master WHERE type='table'")):
            report["blockers"].append("virtual tables require manual review")
        trigger_count = dst.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0]
        if trigger_count:
            report["blockers"].append("source copy contains triggers; review trigger side effects before sanitizing")
            report["validation"]["trigger_count"] = trigger_count
            raise RuntimeError("trigger review required; no sanitization updates applied")

        # The reset-token email is itself a PK. Purge transient security/cache/queue rows,
        # rather than retain or rewrite that key. Business tables are never purged.
        dst.execute("BEGIN IMMEDIATE")
        for table in sorted(TRANSIENT_TABLES & before_inv.keys()):
            report["purged_transient_tables"][table] = before["counts"][table]
            dst.execute(f"DELETE FROM {q(table)}")

        unresolved: list[str] = []
        for table, info in before_inv.items():
            fk_cols = {fk["from"] for fk in info["foreign_keys"]}
            for col in info["columns"]:
                name, hidden = col["name"], col.get("hidden", 0)
                cat = category(name)
                if hidden:
                    if cat or SENSITIVE_CANDIDATE.search(name): unresolved.append(f"{table}.{name} (generated/hidden sensitive field)")
                    continue
                if table in TRANSIENT_TABLES: continue
                if name in fk_cols or col["pk"]:
                    if cat or (SENSITIVE_CANDIDATE.search(name) and name.lower() not in SAFE_STRUCTURAL_NAMES): unresolved.append(f"{table}.{name} (sensitive key requires manual review)")
                    continue
                if cat is None:
                    if SENSITIVE_CANDIDATE.search(name) and name not in fk_cols and name.lower() not in SAFE_STRUCTURAL_NAMES:
                        unresolved.append(f"{table}.{name}")
                    continue
                _sanitize_column(dst, table, name, cat, info, report)

        dst.commit()
        after_inv = inventory(dst)
        after = collect_fingerprints(dst, after_inv)
        schema_after = schema_fingerprint(dst)
        residual = _verify_sanitized_fields(dst, report["sanitized_fields"], after_inv)
        duplicates_after = duplicate_commission_orders(dst)
        report["validation"].update({
            "integrity_check_before": integrity_before,
            "integrity_check_after": [r[0] for r in dst.execute("PRAGMA integrity_check")],
            "foreign_key_violation_count_before": fk_before,
            "foreign_key_violation_count_after": table_fk_violations(dst),
            "schema_and_indexes_preserved": schema_before == schema_after,
            "migration_history_preserved": before.get("migration_history") is not None and before.get("migration_history") == after.get("migration_history"),
            "business_primary_keys_preserved": all(before["primary_keys"].get(t) == after["primary_keys"].get(t) for t in before["primary_keys"] if t not in TRANSIENT_TABLES),
            "business_row_counts_preserved": all(before["counts"].get(t) == after["counts"].get(t) for t in before["counts"] if t not in TRANSIENT_TABLES),
            "row_counts_before": before["counts"], "row_counts_after": after["counts"],
            "order_and_foreign_key_relationships_preserved": before["relationships"] == after["relationships"],
            "individual_financial_records_preserved": before["financial_records"] == after["financial_records"],
            "duplicate_commission_order_count_before": duplicates_before,
            "duplicate_commission_order_count_after": duplicates_after,
            "sensitive_field_residual_counts": residual,
            "all_reported_sensitive_fields_sanitized": all(v == 0 for v in residual.values()),
            "unreviewed_sensitive_columns": sorted(set(unresolved)),
        })
        v = report["validation"]
        checks = [
            (v["integrity_check_after"] == ["ok"], "SQLite integrity_check failed"),
            (v["foreign_key_violation_count_after"] == 0, "foreign-key violations remain"),
            (v["schema_and_indexes_preserved"], "schema or indexes changed"),
            (v["migration_history_preserved"], "migration history changed or missing"),
            (v["business_primary_keys_preserved"], "business primary keys changed"),
            (v["business_row_counts_preserved"], "business table row counts changed"),
            (v["order_and_foreign_key_relationships_preserved"], "order or foreign-key relationships changed"),
            (v["individual_financial_records_preserved"], "individual financial records changed"),
            (v["all_reported_sensitive_fields_sanitized"], "sensitive fields failed post-sanitization checks"),
            (not v["unreviewed_sensitive_columns"], "sensitive-looking columns require manual classification"),
            (duplicates_after == 0, "duplicate commissions.order_id values block migration 16"),
        ]
        report["blockers"].extend(message for ok, message in checks if not ok)
        dst.close()
        dst = None
        source_hash_after = sha256_file(source)
        report["source_sha256_after"] = source_hash_after
        report["source_unchanged"] = source_hash_before == source_hash_after
        if not report["source_unchanged"]: report["blockers"].append("source backup checksum changed")
        report["output_sha256"] = sha256_file(temp)
        report["sanitized_copy_created"] = True
        report["migration_ready"] = not report["blockers"]
        os.replace(temp, output)
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({"sanitized_copy_created": True, "migration_ready": report["migration_ready"], "output": output.name, "report": report_path.name, "blockers": report["blockers"]}, indent=2))
        return 0 if report["migration_ready"] else 2
    except Exception as exc:
        if dst is not None:
            try: dst.rollback()
            except sqlite3.Error: pass
            try: dst.close()
            except sqlite3.Error: pass
        if src is not None:
            try: src.close()
            except sqlite3.Error: pass
        print(f"Sanitization stopped safely: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

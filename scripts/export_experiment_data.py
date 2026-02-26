#!/usr/bin/env python3
"""
실험 데이터 CSV 내보내기 스크립트

사용법:
    python scripts/export_experiment_data.py [OPTIONS]

옵션:
    --db          DB 파일 경로 (기본: ./magentic_ui.db)
    --output-dir  CSV 출력 디렉토리 (기본: ./experiment_export)
    --participant  특정 참여자 ID만 내보내기
    --condition   특정 실험 조건만 내보내기

예시:
    python scripts/export_experiment_data.py
    python scripts/export_experiment_data.py --db /path/to/magentic_ui.db
    python scripts/export_experiment_data.py --participant P001
    python scripts/export_experiment_data.py --condition multi_transparent
"""

import argparse
import csv
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


def get_db_connection(db_path: str) -> sqlite3.Connection:
    """SQLite DB 연결을 반환합니다."""
    if not os.path.exists(db_path):
        print(f"오류: DB 파일을 찾을 수 없습니다: {db_path}")
        sys.exit(1)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def export_experiment_logs(
    conn: sqlite3.Connection,
    output_dir: str,
    participant_id: str | None = None,
    condition: str | None = None,
) -> int:
    """ExperimentLog 테이블을 CSV로 내보냅니다."""
    query = "SELECT * FROM experimentlog WHERE 1=1"
    params: list = []

    if participant_id:
        query += " AND participant_id = ?"
        params.append(participant_id)
    if condition:
        query += " AND experiment_condition = ?"
        params.append(condition)

    query += " ORDER BY created_at ASC"

    cursor = conn.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        print("  (이벤트 로그 데이터 없음)")
        return 0

    filepath = os.path.join(output_dir, "experiment_logs.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id",
            "created_at",
            "participant_id",
            "session_id",
            "run_id",
            "experiment_condition",
            "event_type",
            "event_data",
        ])
        for row in rows:
            event_data = row["event_data"]
            if event_data and isinstance(event_data, str):
                try:
                    event_data = json.loads(event_data)
                except json.JSONDecodeError:
                    pass
            writer.writerow([
                row["id"],
                row["created_at"],
                row["participant_id"],
                row["session_id"],
                row["run_id"],
                row["experiment_condition"],
                row["event_type"],
                json.dumps(event_data, ensure_ascii=False) if event_data else "",
            ])

    print(f"  이벤트 로그: {len(rows)}건 → {filepath}")
    return len(rows)


def export_survey_responses(
    conn: sqlite3.Connection,
    output_dir: str,
    participant_id: str | None = None,
    condition: str | None = None,
) -> int:
    """ExperimentSurvey 테이블을 CSV로 내보냅니다.
    설문 응답의 각 항목을 개별 컬럼으로 펼칩니다."""
    query = "SELECT * FROM experimentsurvey WHERE 1=1"
    params: list = []

    if participant_id:
        query += " AND participant_id = ?"
        params.append(participant_id)
    if condition:
        query += " AND experiment_condition = ?"
        params.append(condition)

    query += " ORDER BY created_at ASC"

    cursor = conn.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        print("  (설문 응답 데이터 없음)")
        return 0

    # Collect all response keys to create column headers
    all_response_keys: set[str] = set()
    parsed_responses: list[dict] = []
    for row in rows:
        resp = row["responses"]
        if resp and isinstance(resp, str):
            try:
                resp = json.loads(resp)
            except json.JSONDecodeError:
                resp = {}
        elif not resp:
            resp = {}
        parsed_responses.append(resp)
        all_response_keys.update(resp.keys())

    # Sort keys for consistent column order
    sorted_keys = sorted(all_response_keys)

    filepath = os.path.join(output_dir, "survey_responses.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        header = [
            "id",
            "created_at",
            "participant_id",
            "experiment_condition",
            "session_id",
        ] + sorted_keys
        writer.writerow(header)

        for row, resp in zip(rows, parsed_responses):
            base = [
                row["id"],
                row["created_at"],
                row["participant_id"],
                row["experiment_condition"],
                row["session_id"],
            ]
            response_values = [resp.get(k, "") for k in sorted_keys]
            writer.writerow(base + response_values)

    print(f"  설문 응답: {len(rows)}건 → {filepath}")
    return len(rows)


def export_messages(
    conn: sqlite3.Connection,
    output_dir: str,
    participant_id: str | None = None,
) -> int:
    """Message 테이블에서 실험 세션의 메시지를 CSV로 내보냅니다."""
    # If participant_id is given, filter by sessions from experiment logs
    if participant_id:
        session_query = (
            "SELECT DISTINCT session_id FROM experimentlog "
            "WHERE participant_id = ? AND session_id IS NOT NULL"
        )
        cursor = conn.execute(session_query, [participant_id])
        session_ids = [r["session_id"] for r in cursor.fetchall()]
        if not session_ids:
            print("  (해당 참여자의 메시지 데이터 없음)")
            return 0
        placeholders = ",".join("?" * len(session_ids))
        query = f"SELECT * FROM message WHERE session_id IN ({placeholders}) ORDER BY created_at ASC"
        params = session_ids
    else:
        # Export all messages from sessions that have experiment logs
        query = (
            "SELECT m.* FROM message m "
            "INNER JOIN (SELECT DISTINCT session_id FROM experimentlog WHERE session_id IS NOT NULL) e "
            "ON m.session_id = e.session_id "
            "ORDER BY m.created_at ASC"
        )
        params = []

    cursor = conn.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        print("  (메시지 데이터 없음)")
        return 0

    filepath = os.path.join(output_dir, "messages.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id",
            "created_at",
            "session_id",
            "run_id",
            "user_id",
            "source",
            "content",
            "message_meta",
        ])
        for row in rows:
            config = row["config"]
            if config and isinstance(config, str):
                try:
                    config = json.loads(config)
                except json.JSONDecodeError:
                    config = {}
            elif not config:
                config = {}

            source = config.get("source", "") if isinstance(config, dict) else ""
            content = config.get("content", "") if isinstance(config, dict) else ""

            meta = row["message_meta"]
            if meta and isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except json.JSONDecodeError:
                    pass

            writer.writerow([
                row["id"],
                row["created_at"],
                row["session_id"],
                row["run_id"],
                row["user_id"],
                source,
                content[:500] if content else "",  # Truncate long content
                json.dumps(meta, ensure_ascii=False) if meta else "",
            ])

    print(f"  메시지: {len(rows)}건 → {filepath}")
    return len(rows)


def export_summary(
    conn: sqlite3.Connection,
    output_dir: str,
) -> None:
    """참여자별 요약 통계를 CSV로 내보냅니다."""
    query = """
        SELECT
            participant_id,
            experiment_condition,
            COUNT(*) as total_events,
            MIN(created_at) as first_event,
            MAX(created_at) as last_event,
            SUM(CASE WHEN event_type = 'task_start' THEN 1 ELSE 0 END) as task_starts,
            SUM(CASE WHEN event_type = 'task_end' THEN 1 ELSE 0 END) as task_ends,
            SUM(CASE WHEN event_type = 'message_sent' THEN 1 ELSE 0 END) as messages_sent,
            SUM(CASE WHEN event_type = 'plan_approved' THEN 1 ELSE 0 END) as plans_approved,
            SUM(CASE WHEN event_type = 'consent_given' THEN 1 ELSE 0 END) as consents
        FROM experimentlog
        WHERE participant_id IS NOT NULL
        GROUP BY participant_id, experiment_condition
        ORDER BY first_event ASC
    """
    cursor = conn.execute(query)
    rows = cursor.fetchall()

    if not rows:
        print("  (요약 데이터 없음)")
        return

    filepath = os.path.join(output_dir, "participant_summary.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "participant_id",
            "experiment_condition",
            "total_events",
            "first_event",
            "last_event",
            "task_starts",
            "task_ends",
            "messages_sent",
            "plans_approved",
            "consents",
        ])
        for row in rows:
            writer.writerow([
                row["participant_id"],
                row["experiment_condition"],
                row["total_events"],
                row["first_event"],
                row["last_event"],
                row["task_starts"],
                row["task_ends"],
                row["messages_sent"],
                row["plans_approved"],
                row["consents"],
            ])

    print(f"  참여자 요약: {len(rows)}건 → {filepath}")


def main():
    parser = argparse.ArgumentParser(
        description="Magentic-UI 실험 데이터를 CSV로 내보내기"
    )
    parser.add_argument(
        "--db",
        default="./magentic_ui.db",
        help="SQLite DB 파일 경로 (기본: ./magentic_ui.db)",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="CSV 출력 디렉토리 (기본: ./experiment_export)",
    )
    parser.add_argument(
        "--participant",
        default=None,
        help="특정 참여자 ID만 내보내기",
    )
    parser.add_argument(
        "--condition",
        default=None,
        choices=[
            "single_agent",
            "multi_blackbox",
            "multi_transparent",
            "multi_coplan",
        ],
        help="특정 실험 조건만 내보내기",
    )

    args = parser.parse_args()

    # Set output directory with timestamp
    if args.output_dir:
        output_dir = args.output_dir
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"./experiment_export_{timestamp}"

    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("Magentic-UI 실험 데이터 내보내기")
    print("=" * 60)
    print(f"  DB 경로: {args.db}")
    print(f"  출력 디렉토리: {output_dir}")
    if args.participant:
        print(f"  참여자 필터: {args.participant}")
    if args.condition:
        print(f"  조건 필터: {args.condition}")
    print("-" * 60)

    conn = get_db_connection(args.db)

    try:
        # Check if experiment tables exist
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('experimentlog', 'experimentsurvey')"
        )
        existing_tables = {row["name"] for row in cursor.fetchall()}

        total = 0

        if "experimentlog" in existing_tables:
            print("\n[1/4] 이벤트 로그 내보내기...")
            total += export_experiment_logs(
                conn, output_dir, args.participant, args.condition
            )

            print("\n[2/4] 참여자 요약 생성...")
            export_summary(conn, output_dir)
        else:
            print("\n  experimentlog 테이블이 존재하지 않습니다.")

        if "experimentsurvey" in existing_tables:
            print("\n[3/4] 설문 응답 내보내기...")
            total += export_survey_responses(
                conn, output_dir, args.participant, args.condition
            )
        else:
            print("\n  experimentsurvey 테이블이 존재하지 않습니다.")

        # Messages table should always exist
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='message'"
        )
        if cursor.fetchone() and "experimentlog" in existing_tables:
            print("\n[4/4] 실험 세션 메시지 내보내기...")
            total += export_messages(conn, output_dir, args.participant)
        else:
            print("\n  message 테이블 또는 실험 세션 데이터가 없습니다.")

        print("\n" + "=" * 60)
        print(f"내보내기 완료! 총 {total}건의 레코드")
        print(f"출력 위치: {os.path.abspath(output_dir)}")
        print("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()

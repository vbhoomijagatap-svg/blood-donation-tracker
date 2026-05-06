from pathlib import Path

from env_loader import load_env_file


BASE_DIR = Path(__file__).resolve().parent
load_env_file(BASE_DIR / ".env")

from server import build_ready_message, get_connection, init_database, is_ready_to_donate, send_whatsapp_text


def main():
    init_database()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT donors.*, users.email AS owner_email, users.name AS owner_name
            FROM donors
            LEFT JOIN users ON users.id = donors.user_id
            WHERE donors.consent = 1
            ORDER BY next_donation ASC, name ASC
            """
        ).fetchall()

    ready_donors = [row for row in rows if is_ready_to_donate(row["next_donation"])]
    sent = 0
    failures = []

    for donor in ready_donors:
        try:
            send_whatsapp_text(donor["phone"], build_ready_message(donor))
            sent += 1
        except RuntimeError as error:
            failures.append(f"{donor['name']}: {error}")

    with get_connection() as connection:
        connection.execute(
            "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
            (None, "scheduled_whatsapp_reminders", f"Sent {sent}; failures {len(failures)}"),
        )
        connection.commit()

    print(f"Sent {sent} scheduled WhatsApp reminder(s).")
    if failures:
        print("Failures:")
        for failure in failures[:10]:
            print(f"- {failure}")


if __name__ == "__main__":
    main()

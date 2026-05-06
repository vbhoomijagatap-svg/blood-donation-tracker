from datetime import datetime, timedelta
from http import cookies
import hashlib
import hmac
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import re
from pathlib import Path
import secrets
import sqlite3
import urllib.error
import urllib.request
from urllib.parse import unquote


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "donors.db"
DONATION_GAP_DAYS = 90
PASSWORD_ITERATIONS = 200_000
SESSION_COOKIE = "bdt_session"
PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.environ.get("WHATSAPP_API_VERSION", "v19.0")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def calculate_next_donation(last_donation):
    date_value = datetime.strptime(last_donation, "%Y-%m-%d").date()
    return (date_value + timedelta(days=DONATION_GAP_DAYS)).isoformat()


def is_ready_to_donate(next_donation):
    next_date = datetime.strptime(next_donation, "%Y-%m-%d").date()
    return next_date <= datetime.now().date()


def normalize_phone(phone):
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def build_ready_message(donor):
    return (
        f"Hello {donor['name']}, good news. You are ready to donate blood today. "
        "If you are healthy and available, please consider donating again. "
        "Your one donation can become someone's second chance."
    )


def send_whatsapp_text(phone, message):
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        raise RuntimeError(
            "WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID before starting the server."
        )

    url = (
        f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/"
        f"{WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_phone(phone),
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"WhatsApp API error: {detail}") from error


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_ITERATIONS
    ).hex()
    return salt, password_hash


def verify_password(password, salt, expected_hash):
    _, password_hash = hash_password(password, salt)
    return hmac.compare_digest(password_hash, expected_hash)


def init_database():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS donors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                blood_group TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                state TEXT,
                city TEXT NOT NULL,
                hospital TEXT NOT NULL,
                last_donation TEXT NOT NULL,
                next_donation TEXT NOT NULL,
                consent INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                detail TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        existing_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(donors)").fetchall()
        }
        if "user_id" not in existing_columns:
            connection.execute("ALTER TABLE donors ADD COLUMN user_id INTEGER")
        if "consent" not in existing_columns:
            connection.execute("ALTER TABLE donors ADD COLUMN consent INTEGER NOT NULL DEFAULT 0")
        if "state" not in existing_columns:
            connection.execute("ALTER TABLE donors ADD COLUMN state TEXT")
        connection.commit()


def mask_phone(phone):
    if not phone:
        return ""
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) < 5:
        return "Private"
    return f"{digits[:2]}****{digits[-3:]}"


def mask_email(email):
    if not email or "@" not in email:
        return "Private"
    name, domain = email.split("@", 1)
    visible = name[:2] if len(name) > 2 else name[:1]
    return f"{visible}***@{domain}"


def donor_row_to_dict(row, current_user_id=None):
    is_owner = row["user_id"] == current_user_id
    owner_email = row["owner_email"] or ""
    owner_account = row["owner_name"] or (owner_email.split("@", 1)[0] if owner_email else "Unassigned")
    return {
        "id": row["id"],
        "ownerAccount": owner_account,
        "ownerEmail": owner_email if is_owner else mask_email(owner_email),
        "isOwner": is_owner,
        "name": row["name"],
        "bloodGroup": row["blood_group"],
        "phone": row["phone"] if is_owner else mask_phone(row["phone"]),
        "email": (row["email"] or "") if is_owner else mask_email(row["email"] or ""),
        "state": row["state"] or "",
        "city": row["city"],
        "hospital": row["hospital"],
        "lastDonation": row["last_donation"],
        "nextDonation": row["next_donation"],
        "consent": bool(row["consent"]),
        "createdAt": row["created_at"],
    }


def user_row_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
    }


class BloodDonationHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_session_json(self, user, token, status=200):
        body = json.dumps(user).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800",
        )
        self.end_headers()
        self.wfile.write(body)

    def clear_session_cookie(self):
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        )

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body or "{}")

    def get_cookie_token(self):
        header = self.headers.get("Cookie")
        if not header:
            return None
        jar = cookies.SimpleCookie()
        jar.load(header)
        morsel = jar.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def current_user(self):
        token = self.get_cookie_token()
        if not token:
            return None
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT users.* FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ?
                """,
                (token,),
            ).fetchone()
        return row

    def require_user(self):
        user = self.current_user()
        if not user:
            self.send_json({"error": "Please login to continue."}, status=401)
            return None
        return user

    def audit(self, user_id, action, detail=""):
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                (user_id, action, detail),
            )
            connection.commit()

    def do_GET(self):
        if self.path == "/api/me":
            user = self.require_user()
            if not user:
                return
            self.send_json(user_row_to_dict(user))
            return

        if self.path == "/api/donors":
            user = self.require_user()
            if not user:
                return
            with get_connection() as connection:
                rows = connection.execute(
                    """
                    SELECT donors.*, users.email AS owner_email, users.name AS owner_name
                    FROM donors
                    LEFT JOIN users ON users.id = donors.user_id
                    ORDER BY next_donation ASC, name ASC
                    """
                ).fetchall()
            self.send_json([donor_row_to_dict(row, user["id"]) for row in rows])
            return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/register":
            self.handle_register()
            return

        if self.path == "/api/login":
            self.handle_login()
            return

        if self.path == "/api/logout":
            self.handle_logout()
            return

        if self.path == "/api/donors":
            self.handle_create_donor()
            return

        if self.path == "/api/reminders/send":
            self.handle_send_reminders()
            return

        self.send_error(404)

    def handle_register(self):
        try:
            data = self.read_json()
            email = data["email"].strip().lower()
            password = data["password"]
            name = email.split("@", 1)[0]

            if "@" not in email:
                self.send_json({"error": "Enter a valid email."}, status=400)
                return
            if not PASSWORD_PATTERN.match(password):
                self.send_json(
                    {"error": "Password must use 8+ chars with uppercase, lowercase, number, and symbol."},
                    status=400,
                )
                return

            salt, password_hash = hash_password(password)
            token = secrets.token_urlsafe(32)
            with get_connection() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO users (name, email, password_salt, password_hash)
                    VALUES (?, ?, ?, ?)
                    """,
                    (name, email, salt, password_hash),
                )
                user_id = cursor.lastrowid
                connection.execute(
                    "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
                    (token, user_id),
                )
                connection.execute(
                    "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                    (user_id, "register", "Account created"),
                )
                connection.commit()
                row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            self.send_session_json(user_row_to_dict(row), token, status=201)
        except sqlite3.IntegrityError:
            self.send_json({"error": "An account with this email already exists."}, status=409)
        except (KeyError, json.JSONDecodeError):
            self.send_json({"error": "Invalid registration data."}, status=400)

    def handle_login(self):
        try:
            data = self.read_json()
            email = data["email"].strip().lower()
            password = data["password"]
            with get_connection() as connection:
                row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
                if not row or not verify_password(password, row["password_salt"], row["password_hash"]):
                    self.send_json({"error": "Invalid email or password."}, status=401)
                    return
                token = secrets.token_urlsafe(32)
                connection.execute(
                    "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
                    (token, row["id"]),
                )
                connection.execute(
                    "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                    (row["id"], "login", "User logged in"),
                )
                connection.commit()
            self.send_session_json(user_row_to_dict(row), token)
        except (KeyError, json.JSONDecodeError):
            self.send_json({"error": "Invalid login data."}, status=400)

    def handle_logout(self):
        token = self.get_cookie_token()
        if token:
            with get_connection() as connection:
                row = connection.execute("SELECT user_id FROM sessions WHERE token = ?", (token,)).fetchone()
                connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
                if row:
                    connection.execute(
                        "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                        (row["user_id"], "logout", "User logged out"),
                    )
                connection.commit()
        self.send_response(204)
        self.clear_session_cookie()
        self.end_headers()

    def handle_create_donor(self):
        user = self.require_user()
        if not user:
            return

        try:
            donor = self.read_json()
            if not donor.get("consent"):
                self.send_json({"error": "Consent is required before saving donor details."}, status=400)
                return
            next_donation = calculate_next_donation(donor["lastDonation"])
            with get_connection() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO donors (
                        user_id, name, blood_group, phone, email, state, city, hospital,
                        last_donation, next_donation, consent
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user["id"],
                        donor["name"],
                        donor["bloodGroup"],
                        donor["phone"],
                        donor.get("email", ""),
                        donor.get("state", ""),
                        donor["city"],
                        donor["hospital"],
                        donor["lastDonation"],
                        next_donation,
                        1,
                    ),
                )
                connection.execute(
                    "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                    (user["id"], "create_donor", f"Created donor record {cursor.lastrowid}"),
                )
                connection.commit()
                row = connection.execute(
                    """
                    SELECT donors.*, users.email AS owner_email, users.name AS owner_name
                    FROM donors
                    LEFT JOIN users ON users.id = donors.user_id
                    WHERE donors.id = ? AND donors.user_id = ?
                    """,
                    (cursor.lastrowid, user["id"]),
                ).fetchone()
            self.send_json(donor_row_to_dict(row, user["id"]), status=201)
        except (KeyError, ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": f"Invalid donor data: {error}"}, status=400)

    def handle_send_reminders(self):
        user = self.require_user()
        if not user:
            return

        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT donors.*, users.email AS owner_email, users.name AS owner_name
                FROM donors
                LEFT JOIN users ON users.id = donors.user_id
                WHERE donors.user_id = ?
                ORDER BY next_donation ASC, name ASC
                """,
                (user["id"],),
            ).fetchall()

        ready_donors = [row for row in rows if is_ready_to_donate(row["next_donation"])]
        if not ready_donors:
            self.send_json({"sent": 0, "message": "No donors are ready for WhatsApp reminder today."})
            return

        sent = 0
        failures = []
        for donor in ready_donors:
            try:
                send_whatsapp_text(donor["phone"], build_ready_message(donor))
                sent += 1
            except RuntimeError as error:
                failures.append({"donor": donor["name"], "error": str(error)})

        with get_connection() as connection:
            connection.execute(
                "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                (
                    user["id"],
                    "send_whatsapp_reminders",
                    f"Sent {sent}; failures {len(failures)}",
                ),
            )
            connection.commit()

        status = 200 if sent else 503
        self.send_json(
            {
                "sent": sent,
                "failed": len(failures),
                "failures": failures[:3],
                "message": "WhatsApp reminders sent." if sent else failures[0]["error"],
            },
            status=status,
        )

    def do_DELETE(self):
        user = self.require_user()
        if not user:
            return

        prefix = "/api/donors/"
        if not self.path.startswith(prefix):
            self.send_error(404)
            return

        donor_id = unquote(self.path.removeprefix(prefix))
        if not donor_id.isdigit():
            self.send_json({"error": "Invalid donor id"}, status=400)
            return

        with get_connection() as connection:
            connection.execute(
                "DELETE FROM donors WHERE id = ? AND user_id = ?",
                (int(donor_id), user["id"]),
            )
            connection.execute(
                "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                (user["id"], "delete_donor", f"Deleted donor record {donor_id}"),
            )
            connection.commit()

        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    init_database()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), BloodDonationHandler)
    print(f"Blood Donation Tracker running at http://{host}:{port}")
    print(f"Local browser link: http://localhost:{port}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()

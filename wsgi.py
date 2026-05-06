from http import cookies
import json
import mimetypes
from pathlib import Path
import secrets
import sqlite3
from urllib.parse import unquote

from server import (
    BASE_DIR,
    PASSWORD_PATTERN,
    SESSION_COOKIE,
    build_ready_message,
    calculate_next_donation,
    donor_row_to_dict,
    get_connection,
    hash_password,
    init_database,
    is_ready_to_donate,
    send_whatsapp_text,
    user_row_to_dict,
    verify_password,
)


init_database()


def status_line(code):
    messages = {
        200: "OK",
        201: "Created",
        204: "No Content",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        503: "Service Unavailable",
    }
    return f"{code} {messages.get(code, 'OK')}"


def json_response(start_response, data, status=200, headers=None):
    body = json.dumps(data).encode("utf-8")
    response_headers = [
        ("Content-Type", "application/json"),
        ("Content-Length", str(len(body))),
    ]
    if headers:
        response_headers.extend(headers)
    start_response(status_line(status), response_headers)
    return [body]


def empty_response(start_response, status=204, headers=None):
    response_headers = headers or []
    start_response(status_line(status), response_headers)
    return [b""]


def read_json(environ):
    length = int(environ.get("CONTENT_LENGTH") or "0")
    body = environ["wsgi.input"].read(length).decode("utf-8")
    return json.loads(body or "{}")


def cookie_token(environ):
    header = environ.get("HTTP_COOKIE")
    if not header:
        return None
    jar = cookies.SimpleCookie()
    jar.load(header)
    morsel = jar.get(SESSION_COOKIE)
    return morsel.value if morsel else None


def current_user(environ):
    token = cookie_token(environ)
    if not token:
        return None
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()


def require_user(environ, start_response):
    user = current_user(environ)
    if not user:
        return None, json_response(start_response, {"error": "Please login to continue."}, status=401)
    return user, None


def session_cookie_header(token, max_age=604800):
    return (
        "Set-Cookie",
        f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}",
    )


def handle_register(environ, start_response):
    try:
        data = read_json(environ)
        email = data["email"].strip().lower()
        password = data["password"]
        name = email.split("@", 1)[0]

        if "@" not in email:
            return json_response(start_response, {"error": "Enter a valid email."}, status=400)
        if not PASSWORD_PATTERN.match(password):
            return json_response(
                start_response,
                {"error": "Password must use 8+ chars with uppercase, lowercase, number, and symbol."},
                status=400,
            )

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
            connection.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
            connection.execute(
                "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                (user_id, "register", "Account created"),
            )
            connection.commit()
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return json_response(start_response, user_row_to_dict(row), status=201, headers=[session_cookie_header(token)])
    except sqlite3.IntegrityError:
        return json_response(start_response, {"error": "An account with this email already exists."}, status=409)
    except (KeyError, json.JSONDecodeError):
        return json_response(start_response, {"error": "Invalid registration data."}, status=400)


def handle_login(environ, start_response):
    try:
        data = read_json(environ)
        email = data["email"].strip().lower()
        password = data["password"]
        with get_connection() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not row or not verify_password(password, row["password_salt"], row["password_hash"]):
                return json_response(start_response, {"error": "Invalid email or password."}, status=401)
            token = secrets.token_urlsafe(32)
            connection.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, row["id"]))
            connection.execute(
                "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
                (row["id"], "login", "User logged in"),
            )
            connection.commit()
        return json_response(start_response, user_row_to_dict(row), headers=[session_cookie_header(token)])
    except (KeyError, json.JSONDecodeError):
        return json_response(start_response, {"error": "Invalid login data."}, status=400)


def handle_logout(environ, start_response):
    token = cookie_token(environ)
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
    return empty_response(start_response, headers=[session_cookie_header("", max_age=0)])


def handle_get_donors(environ, start_response):
    user, error = require_user(environ, start_response)
    if error:
        return error
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT donors.*, users.email AS owner_email, users.name AS owner_name
            FROM donors
            LEFT JOIN users ON users.id = donors.user_id
            ORDER BY next_donation ASC, name ASC
            """
        ).fetchall()
    return json_response(start_response, [donor_row_to_dict(row, user["id"]) for row in rows])


def handle_create_donor(environ, start_response):
    user, error = require_user(environ, start_response)
    if error:
        return error
    try:
        donor = read_json(environ)
        if not donor.get("consent"):
            return json_response(start_response, {"error": "Consent is required before saving donor details."}, status=400)
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
        return json_response(start_response, donor_row_to_dict(row, user["id"]), status=201)
    except (KeyError, ValueError, json.JSONDecodeError) as error:
        return json_response(start_response, {"error": f"Invalid donor data: {error}"}, status=400)


def handle_send_reminders(environ, start_response):
    user, error = require_user(environ, start_response)
    if error:
        return error
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
        return json_response(start_response, {"sent": 0, "message": "No donors are ready for WhatsApp reminder today."})

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
            (user["id"], "send_whatsapp_reminders", f"Sent {sent}; failures {len(failures)}"),
        )
        connection.commit()

    return json_response(
        start_response,
        {
            "sent": sent,
            "failed": len(failures),
            "failures": failures[:3],
            "message": "WhatsApp reminders sent." if sent else failures[0]["error"],
        },
        status=200 if sent else 503,
    )


def handle_delete_donor(environ, start_response, path):
    user, error = require_user(environ, start_response)
    if error:
        return error
    donor_id = unquote(path.removeprefix("/api/donors/"))
    if not donor_id.isdigit():
        return json_response(start_response, {"error": "Invalid donor id"}, status=400)
    with get_connection() as connection:
        connection.execute("DELETE FROM donors WHERE id = ? AND user_id = ?", (int(donor_id), user["id"]))
        connection.execute(
            "INSERT INTO audit_logs (user_id, action, detail) VALUES (?, ?, ?)",
            (user["id"], "delete_donor", f"Deleted donor record {donor_id}"),
        )
        connection.commit()
    return empty_response(start_response)


def serve_static(path, start_response):
    requested = "index.html" if path in ("", "/") else unquote(path.lstrip("/"))
    file_path = (BASE_DIR / requested).resolve()
    if not file_path.is_file() or BASE_DIR not in file_path.parents and file_path != BASE_DIR:
        return json_response(start_response, {"error": "Not found"}, status=404)
    body = file_path.read_bytes()
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    start_response("200 OK", [("Content-Type", content_type), ("Content-Length", str(len(body)))])
    return [body]


def application(environ, start_response):
    method = environ["REQUEST_METHOD"]
    path = environ.get("PATH_INFO", "/")

    if method == "GET" and path == "/api/me":
        user, error = require_user(environ, start_response)
        return error if error else json_response(start_response, user_row_to_dict(user))
    if method == "GET" and path == "/api/donors":
        return handle_get_donors(environ, start_response)
    if method == "POST" and path == "/api/register":
        return handle_register(environ, start_response)
    if method == "POST" and path == "/api/login":
        return handle_login(environ, start_response)
    if method == "POST" and path == "/api/logout":
        return handle_logout(environ, start_response)
    if method == "POST" and path == "/api/donors":
        return handle_create_donor(environ, start_response)
    if method == "POST" and path == "/api/reminders/send":
        return handle_send_reminders(environ, start_response)
    if method == "DELETE" and path.startswith("/api/donors/"):
        return handle_delete_donor(environ, start_response, path)
    if method == "GET":
        return serve_static(path, start_response)

    return json_response(start_response, {"error": "Not found"}, status=404)

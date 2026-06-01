use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::net::TcpListener;
use tower_http::services::ServeDir;

// ──────────────────────────────────────────────────────────────────────────────
// Application state

type Db = Arc<Mutex<Connection>>;

#[derive(Clone)]
struct AppState {
    db: Db,
}

// ──────────────────────────────────────────────────────────────────────────────
// Error helper

type HandlerResult<T> = Result<T, (StatusCode, String)>;

fn db_err(e: rusqlite::Error) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

fn json_err(e: serde_json::Error) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared-state API   GET/POST /api/shared-state

#[derive(Serialize)]
struct SharedStateRow {
    id: String,
    payload: Value,
}

#[derive(Deserialize)]
struct SharedStateInput {
    id: Option<String>,
    payload: Option<Value>,
}

async fn get_shared_state(
    State(state): State<AppState>,
) -> HandlerResult<Json<Vec<SharedStateRow>>> {
    let db = state.db.lock().unwrap();
    let row: Option<(String, String)> = db
        .query_row(
            "SELECT id, payload_json FROM shared_state WHERE id = ?1",
            ["turnaj-koruna"],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .ok();

    let result = match row {
        Some((id, json_str)) => {
            let payload: Value =
                serde_json::from_str(&json_str).unwrap_or(Value::Null);
            vec![SharedStateRow { id, payload }]
        }
        None => vec![SharedStateRow {
            id: "turnaj-koruna".to_string(),
            payload: Value::Null,
        }],
    };

    Ok(Json(result))
}

async fn post_shared_state(
    State(state): State<AppState>,
    Json(input): Json<SharedStateInput>,
) -> HandlerResult<Json<Value>> {
    let id = input
        .id
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "turnaj-koruna".to_string());
    let payload_json =
        serde_json::to_string(&input.payload.unwrap_or(Value::Null)).map_err(json_err)?;
    let updated_at = now_ms();

    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO shared_state (id, payload_json, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET
           payload_json = excluded.payload_json,
           updated_at   = excluded.updated_at",
        params![id, payload_json, updated_at],
    )
    .map_err(db_err)?;

    Ok(Json(json!({ "ok": true })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Tournaments API   GET/POST /api/tournaments

#[derive(Serialize)]
struct TournamentRow {
    id: String,
    name: String,
    description: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Deserialize)]
struct TournamentInput {
    id: Option<String>,
    name: String,
    description: Option<String>,
}

async fn get_tournaments(
    State(state): State<AppState>,
) -> HandlerResult<Json<Vec<TournamentRow>>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db
        .prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM tournaments
             ORDER BY created_at DESC",
        )
        .map_err(db_err)?;

    let rows = stmt
        .query_map([], |r| {
            Ok(TournamentRow {
                id: r.get(0)?,
                name: r.get(1)?,
                description: r.get(2)?,
                created_at: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })
        .map_err(db_err)?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(db_err)?);
    }

    Ok(Json(result))
}

async fn post_tournament(
    State(state): State<AppState>,
    Json(input): Json<TournamentInput>,
) -> HandlerResult<Json<Value>> {
    let now = now_ms();
    let id = input
        .id
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("t-{}", now));

    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO tournaments (id, name, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
           name        = excluded.name,
           description = excluded.description,
           updated_at  = excluded.updated_at",
        params![id, input.name, input.description, now, now],
    )
    .map_err(db_err)?;

    Ok(Json(json!({ "ok": true, "id": id })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Database initialisation

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS shared_state (
            id           TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            updated_at   INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tournaments (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT,
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL
        );
        ",
    )?;

    // Seed the default shared-state row
    conn.execute(
        "INSERT OR IGNORE INTO shared_state (id, payload_json, updated_at)
         VALUES ('turnaj-koruna', 'null', ?1)",
        params![now_ms()],
    )?;

    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

// ──────────────────────────────────────────────────────────────────────────────
// Entry point

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let db_dir: PathBuf = std::env::var("SACHYUH_DB_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("db"));

    let static_dir: PathBuf = std::env::var("SACHYUH_STATIC_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    std::fs::create_dir_all(&db_dir).expect("Failed to create DB directory");

    let db_path = db_dir.join("shared-state.sqlite");
    let conn = Connection::open(&db_path).expect("Failed to open SQLite database");
    init_db(&conn).expect("Failed to initialise database schema");

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
    };

    // API router (takes precedence over static files)
    let api = Router::new()
        .route(
            "/api/shared-state",
            get(get_shared_state).post(post_shared_state),
        )
        .route("/api/tournaments", get(get_tournaments).post(post_tournament));

    // Static file fallback – serves index.html for /
    let static_service = ServeDir::new(&static_dir).append_index_html_on_directories(true);

    let app = api.fallback_service(static_service).with_state(state);

    let bind_addr = format!("127.0.0.1:{}", port);
    println!("sachyuh-turnaj-rust running on http://{}", bind_addr);

    let listener = TcpListener::bind(&bind_addr)
        .await
        .expect("Failed to bind TCP listener");

    axum::serve(listener, app).await.expect("Server error");
}

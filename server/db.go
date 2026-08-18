package main

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	_ "modernc.org/sqlite"
)

type appDB struct {
	core *sql.DB
	user *sql.DB
}

func openDBs(p appPaths) (*appDB, error) {
	out := &appDB{}
	if fileExists(p.coreDB) {
		core, err := sql.Open("sqlite", sqliteURI(p.coreDB, true))
		if err != nil {
			fmt.Println("[db] open core failed:", err)
		} else {
			core.SetMaxOpenConns(1)
			if err := core.Ping(); err != nil {
				fmt.Println("[db] ping core failed:", err)
				_ = core.Close()
			} else {
				out.core = core
				fmt.Println("[db] core opened (readonly)")
			}
		}
	} else {
		fmt.Println("[db] warning: english_core.db missing, dict APIs will return 503")
	}

	if err := os.MkdirAll(p.dataDir, 0o755); err != nil {
		return out, fmt.Errorf("mkdir data: %w", err)
	}
	user, err := sql.Open("sqlite", sqliteURI(p.userDB, false))
	if err != nil {
		return out, fmt.Errorf("open user db: %w", err)
	}
	user.SetMaxOpenConns(1)
	if err := user.Ping(); err != nil {
		_ = user.Close()
		return out, fmt.Errorf("ping user db: %w", err)
	}
	if err := ensureUserSchema(user); err != nil {
		_ = user.Close()
		return out, err
	}
	out.user = user
	fmt.Println("[db] user opened (readwrite)")
	return out, nil
}

func sqliteURI(path string, readonly bool) string {
	p := filepathSlash(path)
	dsn := "file:" + p + "?_pragma=busy_timeout(5000)"
	if readonly {
		dsn += "&mode=ro"
	}
	return dsn
}

func filepathSlash(path string) string {
	return strings.ReplaceAll(path, `\`, `/`)
}

func ensureUserSchema(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS user_word_states (
			word TEXT PRIMARY KEY,
			reps INTEGER DEFAULT 0,
			interval_days REAL DEFAULT 0,
			ef REAL DEFAULT 2.5,
			next_review_at INTEGER NOT NULL,
			status TEXT DEFAULT 'learning',
			box INTEGER DEFAULT 1,
			wrong_count INTEGER DEFAULT 0,
			sources_json TEXT,
			added_at INTEGER,
			last_review_at INTEGER
		)`,
		`CREATE TABLE IF NOT EXISTS user_progress (
			module_id TEXT PRIMARY KEY,
			progress_json TEXT NOT NULL,
			updated_at INTEGER
		)`,
		`CREATE TABLE IF NOT EXISTS user_notes_and_ai (
			id TEXT PRIMARY KEY,
			category TEXT NOT NULL,
			target_key TEXT,
			content_json TEXT NOT NULL,
			created_at INTEGER
		)`,
		`CREATE TABLE IF NOT EXISTS user_blob (
			id TEXT PRIMARY KEY,
			payload_json TEXT NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("schema: %w", err)
		}
	}
	return nil
}

func (d *appDB) close() {
	if d.core != nil {
		_ = d.core.Close()
	}
	if d.user != nil {
		_ = d.user.Close()
	}
}

func (d *appDB) coreReady() bool {
	return d != nil && d.core != nil
}

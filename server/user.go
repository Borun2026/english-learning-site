package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const blobID = "appdata"

func (s *server) handleUserSync(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet, http.MethodHead:
		s.getUserSync(w)
	case http.MethodPost:
		s.postUserSync(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) getUserSync(w http.ResponseWriter) {
	updatedAt, payload, ok, err := s.readBlob()
	if err != nil {
		http.Error(w, "read failed", http.StatusInternalServerError)
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{"updatedAt": 0, "data": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updatedAt": updatedAt, "data": payload})
}

func (s *server) postUserSync(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 20<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var req struct {
		UpdatedAt int64           `json:"updatedAt"`
		Data      json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &req); err != nil || len(req.Data) == 0 {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	var data any
	if err := json.Unmarshal(req.Data, &data); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	storedAt, stored, has, err := s.readBlob()
	if err != nil {
		http.Error(w, "read failed", http.StatusInternalServerError)
		return
	}
	if has && req.UpdatedAt < storedAt {
		writeJSON(w, http.StatusOK, map[string]any{"updatedAt": storedAt, "data": stored, "rejected": true})
		return
	}

	now := time.Now().UnixMilli()
	raw, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "encode failed", http.StatusInternalServerError)
		return
	}
	tx, err := s.db.user.Begin()
	if err != nil {
		http.Error(w, "write failed", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(
		`INSERT INTO user_blob(id, payload_json, updated_at) VALUES(?,?,?)
		 ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at`,
		blobID, string(raw), now,
	)
	if err != nil {
		http.Error(w, "write failed", http.StatusInternalServerError)
		return
	}
	s.bestEffortUpsert(tx, data, now)
	if err := tx.Commit(); err != nil {
		http.Error(w, "write failed", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updatedAt": now, "ok": true})
}

func (s *server) readBlob() (int64, any, bool, error) {
	var updatedAt int64
	var raw string
	err := s.db.user.QueryRow(`SELECT payload_json, updated_at FROM user_blob WHERE id=?`, blobID).Scan(&raw, &updatedAt)
	if err == sql.ErrNoRows {
		return 0, nil, false, nil
	}
	if err != nil {
		return 0, nil, false, err
	}
	var data any
	if json.Unmarshal([]byte(raw), &data) != nil {
		data = nil
	}
	return updatedAt, data, true, nil
}

func (s *server) bestEffortUpsert(tx *sql.Tx, data any, updatedAt int64) {
	m, ok := data.(map[string]any)
	if !ok {
		return
	}
	if ws, ok := m["wordStates"].(map[string]any); ok {
		n := 0
		for word, v := range ws {
			if n >= 5000 {
				break
			}
			n++
			st, ok := v.(map[string]any)
			if !ok {
				continue
			}
			sources, _ := json.Marshal(st["sources"])
			_, err := tx.Exec(
				`INSERT INTO user_word_states(word, reps, interval_days, ef, next_review_at, status, box, wrong_count, sources_json, added_at, last_review_at)
				 VALUES(?,?,?,?,?,?,?,?,?,?,?)
				 ON CONFLICT(word) DO UPDATE SET
				   reps=excluded.reps,
				   interval_days=excluded.interval_days,
				   ef=excluded.ef,
				   next_review_at=excluded.next_review_at,
				   status=excluded.status,
				   box=excluded.box,
				   wrong_count=excluded.wrong_count,
				   sources_json=excluded.sources_json,
				   added_at=excluded.added_at,
				   last_review_at=excluded.last_review_at`,
				strings.ToLower(word),
				asInt(st["reps"]),
				asFloat(st["interval"]),
				asFloat(st["ef"]),
				asInt64(st["next"]),
				asStrDefault(st["status"], "learning"),
				asInt(st["box"]),
				asInt(st["wrongCount"]),
				string(sources),
				asInt64(st["addedAt"]),
				asInt64(st["lastReviewAt"]),
			)
			if err != nil {
				fmt.Println(err)
			}
		}
	}
	if prog, ok := m["progress"].(map[string]any); ok {
		for id, v := range prog {
			raw, err := json.Marshal(v)
			if err != nil {
				continue
			}
			_, err = tx.Exec(
				`INSERT INTO user_progress(module_id, progress_json, updated_at) VALUES(?,?,?)
				 ON CONFLICT(module_id) DO UPDATE SET progress_json=excluded.progress_json, updated_at=excluded.updated_at`,
				id, string(raw), updatedAt,
			)
			if err != nil {
				fmt.Println(err)
			}
		}
	}
}

func asInt(v any) int {
	return int(asInt64(v))
}

func asInt64(v any) int64 {
	switch t := v.(type) {
	case nil:
		return 0
	case float64:
		return int64(t)
	case int64:
		return t
	case int:
		return int64(t)
	case json.Number:
		n, _ := t.Int64()
		return n
	case string:
		n, _ := strconv.ParseInt(t, 10, 64)
		return n
	default:
		return 0
	}
}

func asFloat(v any) float64 {
	switch t := v.(type) {
	case nil:
		return 0
	case float64:
		return t
	case int64:
		return float64(t)
	case int:
		return float64(t)
	case json.Number:
		n, _ := t.Float64()
		return n
	case string:
		n, _ := strconv.ParseFloat(t, 64)
		return n
	default:
		return 0
	}
}

func asStrDefault(v any, def string) string {
	if s, ok := v.(string); ok && s != "" {
		return s
	}
	return def
}

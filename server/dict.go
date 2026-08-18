package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func (s *server) handleDictLookup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.db.coreReady() {
		http.Error(w, "dictionary unavailable", http.StatusServiceUnavailable)
		return
	}
	word := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("word")))
	if word == "" {
		writeJSON(w, http.StatusOK, map[string]any{"dict": nil, "bank": nil})
		return
	}
	for _, cand := range lemmaCandidates(word) {
		row, err := loadDictRow(s.db.core, cand)
		if err != nil {
			http.Error(w, "lookup failed", http.StatusInternalServerError)
			return
		}
		if row != nil {
			writeJSON(w, http.StatusOK, map[string]any{"dict": row.toDict(), "bank": row.toBank()})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"dict": nil, "bank": nil})
}

func (s *server) handleDictSuggest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.db.coreReady() {
		http.Error(w, "dictionary unavailable", http.StatusServiceUnavailable)
		return
	}
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	limit := 10
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 50 {
		limit = 50
	}
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]any{"items": []any{}, "entries": []any{}})
		return
	}

	seen := map[string]bool{}
	var words []string
	push := func(wrd string) {
		wrd = strings.ToLower(strings.TrimSpace(wrd))
		if wrd == "" || seen[wrd] {
			return
		}
		seen[wrd] = true
		words = append(words, wrd)
	}

	like := escapeLike(q) + "%"
	rows, err := s.db.core.Query(`SELECT word FROM dict_entries WHERE word LIKE ? ESCAPE '\' ORDER BY word LIMIT ?`, like, limit)
	if err == nil {
		for rows.Next() {
			var wrd string
			if rows.Scan(&wrd) == nil {
				push(wrd)
			}
		}
		_ = rows.Close()
	}

	if len(words) < limit {
		ftsQ := ftsPrefix(q)
		frows, ferr := s.db.core.Query(`SELECT word FROM dict_fts WHERE dict_fts MATCH ? LIMIT ?`, ftsQ, limit)
		if ferr == nil {
			for frows.Next() {
				var wrd string
				if frows.Scan(&wrd) == nil {
					push(wrd)
				}
			}
			_ = frows.Close()
		}
	}

	if q != "" {
		exact := []string{}
		rest := []string{}
		for _, wrd := range words {
			if wrd == q {
				exact = append(exact, wrd)
			} else {
				rest = append(rest, wrd)
			}
		}
		words = append(exact, rest...)
	}
	if len(words) > limit {
		words = words[:limit]
	}

	type item struct {
		Word string `json:"word"`
		Phon string `json:"phon,omitempty"`
		Cn   string `json:"cn,omitempty"`
	}
	items := make([]item, 0, len(words))
	entries := make([]map[string]any, 0, len(words))
	for _, wrd := range words {
		row, err := loadDictRow(s.db.core, wrd)
		if err != nil || row == nil {
			items = append(items, item{Word: wrd})
			continue
		}
		d := row.toDict()
		b := row.toBank()
		it := item{Word: wrd}
		if phon, ok := d["phon"].(string); ok {
			it.Phon = phon
		}
		if cn, ok := b["cn"].(string); ok {
			it.Cn = cn
		}
		items = append(items, it)
		entries = append(entries, d)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "entries": entries})
}

type dictRow struct {
	word        string
	phoneticUS  string
	phoneticUK  string
	posJSON     string
	phrasesJSON string
	synosJSON   string
	relsJSON    string
	sentences   string
	mnemonic    string
	level       int
	freqOrder   int
}

func loadDictRow(db *sql.DB, word string) (*dictRow, error) {
	rows, err := db.Query(`SELECT * FROM dict_entries WHERE word=? LIMIT 1`, word)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, nil
	}
	names, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	raw := make([]any, len(names))
	ptrs := make([]any, len(names))
	for i := range raw {
		ptrs[i] = &raw[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return nil, err
	}
	m := map[string]string{}
	for i, n := range names {
		m[strings.ToLower(n)] = asString(raw[i])
	}
	out := &dictRow{word: firstNonEmpty(m["word"], word)}
	out.phoneticUS = firstNonEmpty(m["phonetic_us"], m["phonus"], m["phon_us"])
	out.phoneticUK = firstNonEmpty(m["phonetic_uk"], m["phon"], m["phon_uk"])
	out.posJSON = firstNonEmpty(m["pos_json"], m["trans_json"], m["trans"])
	out.phrasesJSON = firstNonEmpty(m["phrases_json"], m["phrases"])
	out.synosJSON = firstNonEmpty(m["synonyms_json"], m["synos_json"], m["synos"])
	out.relsJSON = firstNonEmpty(m["cognates_json"], m["rels_json"], m["rels"])
	out.sentences = firstNonEmpty(m["sentences_json"], m["sentences"])
	out.mnemonic = firstNonEmpty(m["mnemonic"], m["mnemonic_json"])
	out.level = atoi(firstNonEmpty(m["level"]))
	out.freqOrder = atoi(firstNonEmpty(m["freq_order"], m["order"]))
	return out, nil
}

func (r *dictRow) toDict() map[string]any {
	phon := r.phoneticUK
	if phon == "" {
		phon = r.phoneticUS
	}
	d := map[string]any{
		"word":      r.word,
		"phon":      phon,
		"trans":     parseTrans(r.posJSON),
		"sentences": parseJSONArr(r.sentences),
		"phrases":   parseJSONArr(r.phrasesJSON),
		"synos":     parseJSONArr(r.synosJSON),
		"rels":      parseJSONArr(r.relsJSON),
		"mnemonic":  r.mnemonic,
		"level":     r.level,
	}
	if r.phoneticUS != "" && r.phoneticUS != phon {
		d["phonUs"] = r.phoneticUS
	}
	return d
}

func (r *dictRow) toBank() map[string]any {
	trans := parseTrans(r.posJSON)
	cn, en := "", ""
	if len(trans) > 0 {
		if v, ok := trans[0]["cn"].(string); ok {
			cn = v
		}
		if v, ok := trans[0]["en"].(string); ok {
			en = v
		}
	}
	phon := r.phoneticUK
	if phon == "" {
		phon = r.phoneticUS
	}
	return map[string]any{
		"word":  r.word,
		"phon":  phon,
		"cn":    cn,
		"enDef": en,
		"level": r.level,
		"order": r.freqOrder,
	}
}

func parseTrans(raw string) []map[string]any {
	arr := parseJSONArr(raw)
	out := make([]map[string]any, 0, len(arr))
	for _, item := range arr {
		pos, _ := item["pos"].(string)
		cn := firstNonEmptyStr(item["cn"], item["tr"], item["tran"])
		en, _ := item["en"].(string)
		m := map[string]any{"pos": pos, "cn": cn}
		if en != "" {
			m["en"] = en
		}
		out = append(out, m)
	}
	return out
}

func parseJSONArr(raw string) []map[string]any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []map[string]any{}
	}
	var arr []map[string]any
	if json.Unmarshal([]byte(raw), &arr) == nil {
		return arr
	}
	var anyArr []any
	if json.Unmarshal([]byte(raw), &anyArr) == nil {
		out := make([]map[string]any, 0, len(anyArr))
		for _, v := range anyArr {
			if m, ok := v.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return out
	}
	return []map[string]any{}
}

func lemmaCandidates(word string) []string {
	w := strings.ToLower(word)
	out := []string{}
	push := func(x string) {
		t := strings.ToLower(x)
		if len(t) <= 1 {
			return
		}
		for _, e := range out {
			if e == t {
				return
			}
		}
		out = append(out, t)
	}
	push(w)
	if strings.HasSuffix(w, "ies") && len(w) > 4 {
		push(w[:len(w)-3] + "y")
	}
	if strings.HasSuffix(w, "es") {
		push(w[:len(w)-2])
		push(w[:len(w)-1])
	}
	if strings.HasSuffix(w, "s") && !strings.HasSuffix(w, "ss") {
		push(w[:len(w)-1])
	}
	if strings.HasSuffix(w, "ing") && len(w) > 5 {
		stem := w[:len(w)-3]
		push(stem)
		push(stem + "e")
		if len(stem) >= 2 && stem[len(stem)-1] == stem[len(stem)-2] {
			push(stem[:len(stem)-1])
		}
	}
	if strings.HasSuffix(w, "ed") && len(w) > 4 {
		stem := w[:len(w)-2]
		push(stem)
		push(w[:len(w)-1])
		if len(stem) >= 2 && stem[len(stem)-1] == stem[len(stem)-2] {
			push(stem[:len(stem)-1])
		}
	}
	return out
}

func escapeLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

func ftsPrefix(q string) string {
	var b strings.Builder
	for _, r := range q {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	s := b.String()
	if s == "" {
		return `""`
	}
	return s + "*"
}

func asString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case []byte:
		return string(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatInt(int64(t), 10)
	default:
		return strings.TrimSpace(toString(t))
	}
}

func toString(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	s := string(b)
	if len(s) >= 2 && s[0] == '"' {
		var out string
		if json.Unmarshal(b, &out) == nil {
			return out
		}
	}
	return s
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func firstNonEmptyStr(vals ...any) string {
	for _, v := range vals {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

func atoi(s string) int {
	n, _ := strconv.Atoi(strings.TrimSpace(s))
	return n
}

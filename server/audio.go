package main

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func (s *server) handleAudioStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		http.Error(w, "missing key", http.StatusBadRequest)
		return
	}
	fp, ctype, ok := s.resolveAudioFile(key)
	if !ok {
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(fp)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", ctype)
	http.ServeContent(w, r, filepath.Base(fp), st.ModTime(), f)
}

func (s *server) handleAudioCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	raw := r.URL.Query().Get("keys")
	var keys []string
	for _, p := range strings.Split(raw, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			keys = append(keys, p)
		}
	}
	hits := make([]string, 0)
	missing := make([]string, 0)
	for _, k := range keys {
		if _, _, ok := s.resolveAudioFile(k); ok {
			hits = append(hits, k)
		} else {
			missing = append(missing, k)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"hits": hits, "missing": missing})
}

func (s *server) resolveAudioFile(key string) (string, string, bool) {
	if rel, ok := s.lookupManifestPath(key); ok {
		if fp, ok := safeJoin(s.paths.audioDir, rel); ok && fileExists(fp) {
			return fp, audioContentType(fp), true
		}
	}
	for _, rel := range fallbackAudioRels(key) {
		if fp, ok := safeJoin(s.paths.audioDir, rel); ok && fileExists(fp) {
			return fp, audioContentType(fp), true
		}
	}
	return "", "", false
}

func (s *server) lookupManifestPath(key string) (string, bool) {
	if !s.db.coreReady() {
		return "", false
	}
	var path string
	err := s.db.core.QueryRow(`SELECT file_path FROM audio_manifest WHERE audio_key=?`, key).Scan(&path)
	if err == sql.ErrNoRows || err != nil {
		return "", false
	}
	path = strings.TrimSpace(path)
	if path == "" {
		return "", false
	}
	return path, true
}

func fallbackAudioRels(key string) []string {
	parts := strings.Split(key, ":")
	if len(parts) < 2 {
		return nil
	}
	var base string
	switch parts[0] {
	case "word":
		base = filepath.ToSlash(filepath.Join("words", strings.ToLower(parts[1])))
	case "unit":
		if len(parts) < 4 {
			return nil
		}
		unit, kind, id := parts[1], parts[2], parts[3]
		switch kind {
		case "article":
			base = filepath.ToSlash(filepath.Join(unit, "article-"+id))
		case "listen":
			base = filepath.ToSlash(filepath.Join(unit, "listen-"+id))
		case "dialogue":
			base = filepath.ToSlash(filepath.Join(unit, "dlg-"+id))
		default:
			return nil
		}
	case "extra":
		if len(parts) < 4 {
			return nil
		}
		base = filepath.ToSlash(filepath.Join("extra", parts[1], parts[2]+"-"+parts[3]))
	default:
		return nil
	}
	return []string{base + ".mp3", base + ".opus", base + ".wav"}
}

func safeJoin(root, rel string) (string, bool) {
	rel = filepath.ToSlash(rel)
	if rel == "" || strings.Contains(rel, "..") {
		return "", false
	}
	clean := filepath.Clean(filepath.Join(root, filepath.FromSlash(rel)))
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", false
	}
	cleanAbs, err := filepath.Abs(clean)
	if err != nil {
		return "", false
	}
	rootAbs = filepath.Clean(rootAbs)
	if cleanAbs != rootAbs && !strings.HasPrefix(cleanAbs, rootAbs+string(os.PathSeparator)) {
		return "", false
	}
	return cleanAbs, true
}

func audioContentType(fp string) string {
	switch strings.ToLower(filepath.Ext(fp)) {
	case ".mp3":
		return "audio/mpeg"
	case ".opus":
		return "audio/ogg"
	case ".wav":
		return "audio/wav"
	default:
		return "application/octet-stream"
	}
}

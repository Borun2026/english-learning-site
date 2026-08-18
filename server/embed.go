package main

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

func spaHandler() http.Handler {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		sub = distFS
	}
	fileServer := http.FileServer(http.FS(sub))
	indexHTML, _ := fs.ReadFile(sub, "index.html")
	fallback := []byte(`<!doctype html><meta charset="utf-8"><title>english-app</title><p>run build_app.bat first</p>`)
	if len(indexHTML) == 0 {
		indexHTML = fallback
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean("/" + r.URL.Path)
		if strings.Contains(p, "..") {
			http.Error(w, "invalid path", http.StatusBadRequest)
			return
		}
		if isReservedPath(p) {
			http.NotFound(w, r)
			return
		}
		rel := strings.TrimPrefix(p, "/")
		if rel == "" {
			rel = "index.html"
		}
		if f, err := sub.Open(rel); err == nil {
			_ = f.Close()
			setStaticCache(w, rel)
			fileServer.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(indexHTML)
	})
}

func setStaticCache(w http.ResponseWriter, rel string) {
	lower := strings.ToLower(rel)
	if rel == "index.html" || strings.HasSuffix(lower, ".json") {
		w.Header().Set("Cache-Control", "no-cache")
		return
	}
	base := path.Base(rel)
	if (strings.HasSuffix(lower, ".js") || strings.HasSuffix(lower, ".css")) && strings.Contains(base, "-") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
}

func isReservedPath(p string) bool {
	return strings.HasPrefix(p, "/api/") ||
		p == "/__ai_proxy" ||
		p == "/piper" ||
		p == "/health"
}

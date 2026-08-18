package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	maxProxyBody = 20 << 20
	proxyTimeout = 120 * time.Second
)

func (s *server) handleAIProxy(w http.ResponseWriter, r *http.Request) {
	if !requireLoopback(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "POST /__ai_proxy or /piper only", http.StatusMethodNotAllowed)
		return
	}
	payload, ok := readProxyJSON(w, r)
	if !ok {
		return
	}
	target, ok := parseTargetURL(w, payload["url"])
	if !ok {
		return
	}
	if target.Scheme != "https" {
		http.Error(w, "only https targets allowed", http.StatusBadRequest)
		return
	}

	headers := map[string]string{"Content-Type": "application/json"}
	if h, ok := payload["headers"].(map[string]any); ok {
		for k, v := range h {
			if s, ok := v.(string); ok {
				headers[k] = s
			}
		}
	}
	body := bodyAsString(payload["body"])
	forward(w, r, target, http.MethodPost, headers, []byte(body), false)
}

func (s *server) handlePiper(w http.ResponseWriter, r *http.Request) {
	if !requireLoopback(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "POST /__ai_proxy or /piper only", http.StatusMethodNotAllowed)
		return
	}
	payload, ok := readProxyJSON(w, r)
	if !ok {
		return
	}
	target, ok := parseTargetURL(w, payload["url"])
	if !ok {
		return
	}
	host := strings.Trim(target.Hostname(), "[]")
	isLocal := host == "127.0.0.1" || host == "localhost" || host == "::1"
	isHTTP := target.Scheme == "http" || target.Scheme == "https"
	if !isLocal || !isHTTP {
		http.Error(w, "only http(s) localhost targets allowed for /piper", http.StatusBadRequest)
		return
	}
	method := http.MethodPost
	if strings.EqualFold(asPlainString(payload["method"]), "GET") {
		method = http.MethodGet
	}
	var headers map[string]string
	var body []byte
	if method != http.MethodGet {
		headers = map[string]string{"Content-Type": "text/plain; charset=utf-8"}
		body = []byte(asPlainString(payload["body"]))
	}
	forward(w, r, target, method, headers, body, true)
}

func readProxyJSON(w http.ResponseWriter, r *http.Request) (map[string]any, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxProxyBody)
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "bad json payload", http.StatusBadRequest)
		return nil, false
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		http.Error(w, "bad json payload", http.StatusBadRequest)
		return nil, false
	}
	return payload, true
}

func parseTargetURL(w http.ResponseWriter, v any) (*url.URL, bool) {
	s, _ := v.(string)
	target, err := url.Parse(s)
	if err != nil || target.Scheme == "" || target.Host == "" {
		http.Error(w, `missing or invalid "url"`, http.StatusBadRequest)
		return nil, false
	}
	return target, true
}

func bodyAsString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	default:
		b, err := json.Marshal(t)
		if err != nil {
			return ""
		}
		return string(b)
	}
}

func asPlainString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	if v == nil {
		return ""
	}
	return bodyAsString(v)
}

func forward(w http.ResponseWriter, r *http.Request, target *url.URL, method string, headers map[string]string, body []byte, binary bool) {
	ctx, cancel := context.WithTimeout(r.Context(), proxyTimeout)
	defer cancel()

	var bodyReader io.Reader
	if method != http.MethodGet && method != http.MethodHead {
		bodyReader = strings.NewReader(string(body))
	}
	req, err := http.NewRequestWithContext(ctx, method, target.String(), bodyReader)
	if err != nil {
		http.Error(w, "proxy error: "+err.Error(), http.StatusBadGateway)
		return
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: proxyTimeout}
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			http.Error(w, "proxy error: upstream request aborted or timed out", http.StatusBadGateway)
			return
		}
		http.Error(w, "proxy error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		if binary {
			ct = "application/octet-stream"
		} else {
			ct = "application/json"
		}
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

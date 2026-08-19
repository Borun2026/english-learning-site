package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

var startedAt = time.Now()

func main() {
	host := flag.String("host", "127.0.0.1", "listen host")
	port := flag.Int("port", 8787, "base listen port; auto-increments if occupied")
	lan := flag.Bool("lan", false, "listen on all interfaces")
	flag.Parse()
	if *lan {
		*host = "0.0.0.0"
	}

	if existing := findExistingInstance(*port); existing > 0 {
		fmt.Printf("[english-app] already running on http://127.0.0.1:%d, opening it in your browser...\n", existing)
		openBrowser(fmt.Sprintf("http://127.0.0.1:%d", existing))
		waitEnter(30 * time.Second)
		return
	}

	paths := resolvePaths()
	dbs, err := openDBs(paths)
	if err != nil {
		fmt.Println("[db] fatal:", err)
		if dbs != nil {
			dbs.close()
		}
		return
	}
	defer dbs.close()

	srv := &server{paths: paths, db: dbs}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.handleHealth)
	mux.HandleFunc("/api/dict/lookup", srv.handleDictLookup)
	mux.HandleFunc("/api/dict/suggest", srv.handleDictSuggest)
	mux.HandleFunc("/api/audio/stream", srv.handleAudioStream)
	mux.HandleFunc("/api/audio/check", srv.handleAudioCheck)
	mux.HandleFunc("/api/user/sync", srv.handleUserSync)
	mux.HandleFunc("/__ai_proxy", srv.handleAIProxy)
	mux.HandleFunc("/piper", srv.handlePiper)
	mux.Handle("/content/audio/", srv.audioFileHandler())
	mux.Handle("/", spaHandler())

	ln, actualPort, err := listenAuto(*host, *port, 100)
	if err != nil {
		fmt.Println("[english-app] fatal:", err)
		waitEnter(60 * time.Second)
		return
	}
	if actualPort != *port {
		fmt.Printf("[port] %d occupied, using %d instead\n", *port, actualPort)
	}
	fmt.Printf("[english-app] listening on http://127.0.0.1:%d\n", actualPort)
	if *lan {
		printLANIPs(actualPort)
	}
	go openBrowser(fmt.Sprintf("http://127.0.0.1:%d", actualPort))
	go srv.preloadAudioManifest()

	hs := &http.Server{
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      180 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	if err := hs.Serve(ln); err != nil {
		fmt.Println("[english-app] serve error:", err)
		waitEnter(60 * time.Second)
		return
	}
}

func listenAuto(host string, base, tries int) (net.Listener, int, error) {
	if base < 1 || base > 65535 {
		base = 8787
	}
	if host == "" {
		host = "127.0.0.1"
	}
	for i := 0; i < tries; i++ {
		p := base + i
		if p > 65535 {
			break
		}
		ln, err := net.Listen("tcp", fmt.Sprintf("%s:%d", host, p))
		if err == nil {
			return ln, p, nil
		}
		fmt.Printf("[port] %d unavailable, trying %d...\n", p, p+1)
	}
	return nil, 0, fmt.Errorf("no free port in %d-%d", base, base+tries-1)
}

type server struct {
	paths appPaths
	db    *appDB

	audioMu      sync.RWMutex
	audioIdx     map[string]string
	audioIdxDone bool
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" && isLoopbackOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		defer func() {
			if rec := recover(); rec != nil {
				fmt.Println("[panic]", rec)
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "english-app",
		"uptime":  int(time.Since(startedAt).Seconds()),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func printLANIPs(port int) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return
	}
	fmt.Println("[english-app] LAN addresses:")
	seen := map[string]bool{}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ip := ipFromAddr(a)
			if ip == nil || ip.IsLoopback() || ip.To4() == nil || !isRFC1918(ip) {
				continue
			}
			s := ip.String()
			if seen[s] {
				continue
			}
			seen[s] = true
			fmt.Printf("  http://%s:%d\n", s, port)
		}
	}
	if len(seen) == 0 {
		fmt.Println("  (none)")
	}
}

func isRFC1918(ip net.IP) bool {
	ip4 := ip.To4()
	if ip4 == nil {
		return false
	}
	if ip4[0] == 10 {
		return true
	}
	if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
		return true
	}
	return ip4[0] == 192 && ip4[1] == 168
}

func isLoopbackOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	h := strings.ToLower(strings.Trim(u.Hostname(), "[]"))
	return h == "127.0.0.1" || h == "localhost" || h == "::1"
}

func ipFromAddr(a net.Addr) net.IP {
	switch v := a.(type) {
	case *net.IPNet:
		return v.IP
	case *net.IPAddr:
		return v.IP
	default:
		return nil
	}
}

func openBrowser(url string) {
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(500 * time.Millisecond)
		}
		if launchBrowser(url) {
			return
		}
	}
	fmt.Println("[browser] failed to open browser automatically, please visit:", url)
}

func launchBrowser(url string) bool {
	var cmds []*exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmds = []*exec.Cmd{
			exec.Command("rundll32", "url.dll,FileProtocolHandler", url),
			exec.Command("cmd", "/c", "start", "", url),
			exec.Command("explorer.exe", url),
		}
	case "darwin":
		cmds = []*exec.Cmd{exec.Command("open", url)}
	default:
		cmds = []*exec.Cmd{exec.Command("xdg-open", url)}
	}
	for _, c := range cmds {
		if err := c.Start(); err == nil {
			return true
		}
	}
	return false
}

func findExistingInstance(base int) int {
	if base < 1 || base > 65535 {
		base = 8787
	}
	max := base + 50
	if max > 65535 {
		max = 65535
	}
	n := max - base + 1
	found := make(chan int, n)
	client := &http.Client{Timeout: 300 * time.Millisecond}
	var wg sync.WaitGroup
	for p := base; p <= max; p++ {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("http://127.0.0.1:%d/health", p), nil)
			if err != nil {
				return
			}
			req.Header.Set("User-Agent", "english-app/probe")
			resp, err := client.Do(req)
			if err != nil {
				return
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
			resp.Body.Close()
			var h struct {
				Service string `json:"service"`
			}
			if json.Unmarshal(body, &h) == nil && h.Service == "english-app" {
				found <- p
			}
		}(p)
	}
	wg.Wait()
	close(found)
	hit := 0
	for p := range found {
		if hit == 0 || p < hit {
			hit = p
		}
	}
	return hit
}

func waitEnter(timeout time.Duration) {
	fmt.Print("[press Enter to close] ")
	ch := make(chan struct{})
	go func() {
		buf := make([]byte, 1)
		_, _ = os.Stdin.Read(buf)
		close(ch)
	}()
	select {
	case <-ch:
	case <-time.After(timeout):
	}
}

func isLoopbackReq(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip != nil && ip.IsLoopback() {
		return true
	}
	h := strings.Trim(host, "[]")
	return h == "127.0.0.1" || h == "::1" || h == "localhost"
}

func requireLoopback(w http.ResponseWriter, r *http.Request) bool {
	if isLoopbackReq(r) {
		return true
	}
	http.Error(w, "loopback only", http.StatusForbidden)
	return false
}

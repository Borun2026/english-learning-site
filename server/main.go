package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

var startedAt = time.Now()

func main() {
	host := flag.String("host", "0.0.0.0", "listen host")
	port := flag.Int("port", 8787, "listen port")
	flag.Parse()

	paths := resolvePaths()
	dbs, err := openDBs(paths)
	if err != nil {
		fmt.Println("[db] fatal:", err)
		os.Exit(1)
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
	mux.Handle("/", spaHandler())

	addr := fmt.Sprintf("%s:%d", *host, *port)
	fmt.Printf("[english-app] listening on http://%s\n", addr)
	printLANIPs(*port)
	go openBrowser(fmt.Sprintf("http://127.0.0.1:%d", *port))

	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		fmt.Println("[english-app] serve error:", err)
		os.Exit(1)
	}
}

type server struct {
	paths appPaths
	db    *appDB
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
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
			if ip == nil || ip.IsLoopback() || ip.To4() == nil {
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
	time.Sleep(300 * time.Millisecond)
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
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

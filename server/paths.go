package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type appPaths struct {
	exeDir   string
	dataDir  string
	audioDir string
	coreDB   string
	userDB   string
}

func resolvePaths() appPaths {
	exeDir := resolveExeDir()
	dataDir := resolveDataDir(exeDir)
	audioDir := resolveAudioDir(exeDir)
	p := appPaths{
		exeDir:   exeDir,
		dataDir:  dataDir,
		audioDir: audioDir,
		coreDB:   filepath.Join(dataDir, "english_core.db"),
		userDB:   filepath.Join(dataDir, "user_learning.db"),
	}
	fmt.Println("[paths] exeDir   =", p.exeDir)
	fmt.Println("[paths] dataDir  =", p.dataDir)
	fmt.Println("[paths] audioDir =", p.audioDir)
	fmt.Println("[paths] coreDB   =", p.coreDB)
	fmt.Println("[paths] userDB   =", p.userDB)
	return p
}

func resolveExeDir() string {
	exe, err := os.Executable()
	if err == nil {
		if resolved, err := filepath.EvalSymlinks(exe); err == nil {
			exe = resolved
		}
		dir := filepath.Dir(exe)
		if !isGoRunTemp(dir) {
			return dir
		}
	}
	cwd, err := os.Getwd()
	if err != nil {
		return "."
	}
	base := filepath.Base(cwd)
	if base == "server" {
		if up2 := filepath.Clean(filepath.Join(cwd, "..", "..")); dirExists(up2) {
			return up2
		}
	}
	return cwd
}

func isGoRunTemp(dir string) bool {
	lower := strings.ToLower(dir)
	return strings.Contains(lower, string(filepath.Separator)+"go-build") ||
		strings.Contains(lower, `\go-build`) ||
		strings.Contains(lower, `/go-build`)
}

func resolveDataDir(exeDir string) string {
	cands := []string{
		filepath.Join(exeDir, "data"),
		filepath.Join(exeDir, "..", "data"),
		filepath.Join(exeDir, "..", "..", "data"),
	}
	for _, c := range cands {
		c = filepath.Clean(c)
		if dirExists(c) {
			return c
		}
	}
	first := filepath.Clean(cands[0])
	_ = os.MkdirAll(first, 0o755)
	return first
}

func resolveAudioDir(exeDir string) string {
	cands := []string{
		filepath.Join(exeDir, "audio_assets"),
		filepath.Join(exeDir, "..", "audio_assets"),
		filepath.Join(exeDir, "..", "..", "audio_assets"),
		filepath.Join(exeDir, "public", "content", "audio"),
		filepath.Join(exeDir, "..", "public", "content", "audio"),
		filepath.Join(exeDir, "..", "english-learning-site", "public", "content", "audio"),
	}
	if site := findSiteDir(exeDir); site != "" {
		cands = append(cands, filepath.Join(site, "public", "content", "audio"))
	}
	for _, c := range cands {
		c = filepath.Clean(c)
		if dirExists(c) {
			return c
		}
	}
	return filepath.Clean(cands[0])
}

func findSiteDir(exeDir string) string {
	cands := []string{
		filepath.Join(exeDir, "english-learning-site"),
		filepath.Join(exeDir, "..", "english-learning-site"),
	}
	if cwd, err := os.Getwd(); err == nil {
		cands = append(cands,
			filepath.Join(cwd, "english-learning-site"),
			filepath.Join(cwd, "..", "english-learning-site"),
		)
		if filepath.Base(cwd) == "english-learning-site" {
			cands = append([]string{cwd}, cands...)
		}
		if filepath.Base(cwd) == "server" {
			cands = append([]string{filepath.Dir(cwd)}, cands...)
		}
	}
	for _, c := range cands {
		c = filepath.Clean(c)
		if dirExists(c) {
			return c
		}
	}
	return ""
}

func dirExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

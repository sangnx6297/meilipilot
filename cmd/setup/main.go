package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/lcs/meilisearchui/internal/installwin"
)

const (
	appVersion = "0.1.0"
	publisher  = "MeiliPilot"
)

func main() {
	if hasFlag("/uninstall") {
		if err := uninstall(); err != nil {
			fatal(err)
		}
		return
	}
	silent := hasFlag("/S") || hasFlag("/silent")
	if err := install(silent); err != nil {
		fatal(err)
	}
}

func install(silent bool) error {
	src, err := payloadExe()
	if err != nil {
		return err
	}
	self, err := os.Executable()
	if err != nil {
		return err
	}
	setupDir := filepath.Dir(self)
	destDir, err := installwin.ProgramsDir()
	if err != nil {
		return fmt.Errorf("LOCALAPPDATA: %w", err)
	}
	destExe := filepath.Join(destDir, "MeiliPilot.exe")
	fmt.Println("=== MeiliPilot Setup ===")
	fmt.Println("Thu muc cai:", destDir)
	fmt.Println("Cai dat se luu cau hinh o %AppData%\\MeiliPilot")
	fmt.Println("May khach khong can Go hay Node.js.")
	if !silent && !confirm("Tiep tuc cai MeiliPilot?", true) {
		fmt.Println("Huy.")
		return nil
	}

	fmt.Println("\n[1/4] WebView2 Runtime (pin trong goi)...")
	if err := ensureWebView2(setupDir, silent); err != nil {
		return err
	}

	fmt.Println("[2/4] Chep ung dung...")
	if err := installwin.CopyFile(src, destExe); err != nil {
		return err
	}
	_ = installwin.CopyFile(self, filepath.Join(destDir, "MeiliPilot-Setup.exe"))

	fmt.Println("[3/4] Shortcut Start Menu...")
	appData, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	lnk := installwin.StartMenuShortcutPath(appData)
	if err := installwin.CreateShortcut(lnk, destExe, destDir); err != nil {
		fmt.Println("  (canh bao shortcut:", err, ")")
	}

	fmt.Println("[4/4] Dang ky uninstall...")
	uninst := filepath.Join(destDir, "MeiliPilot-Setup.exe")
	if err := installwin.WriteUninstallKey("MeiliPilot", appVersion, publisher, destDir, installwin.UninstallArgs(uninst)); err != nil {
		fmt.Println("  (canh bao registry:", err, ")")
	}

	fmt.Println("\nXong. MeiliPilot da cai vao:")
	fmt.Println(" ", destExe)
	fmt.Println("Cau hinh:", filepath.Join(appData, "MeiliPilot"))
	if !silent && confirm("Mo MeiliPilot bay gio?", true) {
		_ = exec.Command(destExe).Start()
	}
	return nil
}

func ensureWebView2(setupDir string, silent bool) error {
	depsPath := filepath.Join(installwin.PayloadDir(setupDir), "deps.json")
	deps, err := installwin.LoadDepsFile(depsPath)
	if err != nil {
		return err
	}
	st := installwin.DefaultDetector().WebView2()
	action := installwin.PlanDep(st.Version, deps.WebView2.Version)
	installed := st.Version
	if installed == "" {
		installed = "(chua co)"
	}
	fmt.Printf("  May: %s | Goi pin: %s\n", installed, deps.WebView2.Version)

	accepted := true
	if msg := installwin.DepConfirmMessage("WebView2", st.Version, deps.WebView2.Version, action); msg != "" {
		if silent {
			accepted = true
		} else {
			accepted = confirm("  "+msg, true)
		}
	}
	consent := installwin.ApplyDepConsent(action, accepted)
	if consent.Abort != nil {
		return consent.Abort
	}
	if !consent.Install {
		if action == installwin.DepUpgrade {
			fmt.Println("  Bo qua nang cap. Giu WebView2 hien co (khong ha cap).")
		} else {
			fmt.Println("  WebView2 du, khong cai de.")
		}
		return nil
	}

	file, err := installwin.ResolvePinnedFile(installwin.PayloadDir(setupDir), deps.WebView2)
	if err != nil {
		return err
	}
	if err := installwin.VerifySHA256(file, deps.WebView2.SHA256); err != nil {
		return err
	}
	fmt.Println("  Cai tu file trong goi (khong tai them)...")
	if err := installwin.RunBootstrapper(file); err != nil {
		return fmt.Errorf("WebView2: %w", err)
	}
	fmt.Println("  Xong.")
	return nil
}

func uninstall() error {
	dir, err := installwin.ProgramsDir()
	if err != nil {
		return err
	}
	appData, _ := os.UserConfigDir()
	_ = os.Remove(installwin.StartMenuShortcutPath(appData))
	_ = installwin.DeleteUninstallKey()
	_ = os.Remove(filepath.Join(dir, "MeiliPilot.exe"))
	_ = os.Remove(filepath.Join(dir, "MeiliPilot-Setup.exe"))
	_ = os.Remove(dir)
	fmt.Println("Da go MeiliPilot khoi", dir)
	fmt.Println("Cau hinh %AppData%\\MeiliPilot giu nguyen.")
	return nil
}

func payloadExe() (string, error) {
	self, err := os.Executable()
	if err != nil {
		return "", err
	}
	dir := filepath.Dir(self)
	cands := []string{
		filepath.Join(dir, "MeiliPilot.exe"),
		filepath.Join(dir, "..", "MeiliPilot.exe"),
	}
	for _, p := range os.Args[1:] {
		if strings.HasPrefix(p, "--payload=") {
			cands = append([]string{strings.TrimPrefix(p, "--payload=")}, cands...)
		}
	}
	for _, p := range cands {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, nil
		}
	}
	return "", fmt.Errorf("khong thay MeiliPilot.exe (dat canh MeiliPilot-Setup.exe)")
}

func confirm(q string, defYes bool) bool {
	hint := "[Y/n]"
	if !defYes {
		hint = "[y/N]"
	}
	fmt.Printf("%s %s ", q, hint)
	sc := bufio.NewScanner(os.Stdin)
	if !sc.Scan() {
		return defYes
	}
	s := strings.TrimSpace(strings.ToLower(sc.Text()))
	if s == "" {
		return defYes
	}
	return s == "y" || s == "yes" || s == "c" || s == "co"
}

func hasFlag(f string) bool {
	for _, a := range os.Args[1:] {
		if strings.EqualFold(a, f) {
			return true
		}
	}
	return false
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "Loi:", err)
	os.Exit(1)
}

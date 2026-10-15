package installwin

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func RunMSI(msiPath string) error {
	cmd := exec.Command("msiexec", "/i", msiPath, "/passive", "/norestart")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err == nil {
		return nil
	}
	return runElevated("msiexec", "/i", msiPath, "/passive", "/norestart")
}

func RunBootstrapper(exePath string) error {
	cmd := exec.Command(exePath, "/silent", "/install")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err == nil {
		return nil
	}
	return runElevated(exePath, "/silent", "/install")
}

func TryWinget(id string) error {
	if _, err := exec.LookPath("winget"); err != nil {
		return err
	}
	cmd := exec.Command("winget", "install", "-e", "--id", id, "--accept-package-agreements", "--accept-source-agreements")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runElevated(name string, args ...string) error {
	argLine := ""
	for _, a := range args {
		argLine += " " + powershellQuote(a)
	}
	ps := fmt.Sprintf(
		`Start-Process -FilePath %s -ArgumentList %s -Verb RunAs -Wait`,
		powershellQuote(name),
		powershellQuote(strings.TrimSpace(argLine)),
	)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", ps)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func CreateShortcut(lnk, target, workDir string) error {
	ps := fmt.Sprintf(
		`$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(%s); $s.TargetPath = %s; $s.WorkingDirectory = %s; $s.Save()`,
		powershellQuote(lnk),
		powershellQuote(target),
		powershellQuote(workDir),
	)
	if err := os.MkdirAll(filepath.Dir(lnk), 0o755); err != nil {
		return err
	}
	cmd := exec.Command("powershell", "-NoProfile", "-Command", ps)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("shortcut: %w: %s", err, out)
	}
	return nil
}

func powershellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

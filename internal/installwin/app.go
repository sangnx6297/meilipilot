package installwin

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const UninstallKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall\MeiliPilot`

func CopyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func WriteBytes(dst string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0o755)
}

func StartMenuShortcutPath(appData string) string {
	return filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "MeiliPilot.lnk")
}

func UninstallArgs(setupExe string) string {
	return fmt.Sprintf(`"%s" /uninstall`, setupExe)
}

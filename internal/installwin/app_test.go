package installwin

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCopyFile(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.exe")
	dst := filepath.Join(dir, "Programs", "MeiliPilot", "MeiliPilot.exe")
	if err := os.WriteFile(src, []byte("mz"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := CopyFile(src, dst); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(dst)
	if err != nil || string(got) != "mz" {
		t.Fatalf("%s %v", got, err)
	}
}

func TestStartMenuShortcutPath(t *testing.T) {
	got := StartMenuShortcutPath(`C:\Users\me\AppData\Roaming`)
	want := filepath.Join(`C:\Users\me\AppData\Roaming`, "Microsoft", "Windows", "Start Menu", "Programs", "MeiliPilot.lnk")
	if got != want {
		t.Fatalf("%s", got)
	}
}

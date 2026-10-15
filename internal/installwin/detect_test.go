package installwin

import (
	"errors"
	"path/filepath"
	"testing"
)

func TestParseGoVersion(t *testing.T) {
	got := ParseGoVersion("go version go1.25.0 windows/amd64\n")
	if got != "go1.25.0" {
		t.Fatalf("got %q", got)
	}
}

func TestParseNodeVersion(t *testing.T) {
	if ParseNodeVersion("v22.11.0\n") != "v22.11.0" {
		t.Fatal("node")
	}
}

func TestDetectorGoPresent(t *testing.T) {
	d := Detector{
		LookPath: func(string) (string, error) { return `C:\Go\bin\go.exe`, nil },
		Run: func(name string, args ...string) (string, error) {
			return "go version go1.25.0 windows/amd64", nil
		},
	}
	st := d.Go()
	if !st.Present || st.Version == "" {
		t.Fatalf("%+v", st)
	}
}

func TestDetectorGoMissing(t *testing.T) {
	d := Detector{
		LookPath: func(string) (string, error) { return "", errors.New("not found") },
	}
	if d.Go().Present {
		t.Fatal("expected missing")
	}
}

func TestDetectorWebView2Version(t *testing.T) {
	d := Detector{WebView2Version: func() string { return "131.0.2903.112" }}
	st := d.WebView2()
	if !st.Present || st.Version != "131.0.2903.112" {
		t.Fatalf("%+v", st)
	}
	missing := Detector{WebView2Version: func() string { return "0.0.0.0" }}
	if missing.WebView2().Present {
		t.Fatal("placeholder pv is not installed")
	}
}

func TestJoinPrograms(t *testing.T) {
	got := joinPrograms(`C:\Users\me\AppData\Local`)
	want := filepath.Join(`C:\Users\me\AppData\Local`, "Programs", "MeiliPilot")
	if got != want {
		t.Fatalf("got %s want %s", got, want)
	}
}

func TestProgramsDirUsesLocalAppData(t *testing.T) {
	root := t.TempDir()
	t.Setenv("LOCALAPPDATA", root)
	got, err := ProgramsDir()
	if err != nil {
		t.Fatal(err)
	}
	if got != filepath.Join(root, "Programs", "MeiliPilot") {
		t.Fatalf("got %s", got)
	}
}

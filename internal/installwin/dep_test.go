package installwin

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWebView2StandaloneURL(t *testing.T) {
	if WebView2StandaloneURL != "https://go.microsoft.com/fwlink/?linkid=2124701" {
		t.Fatalf("%s", WebView2StandaloneURL)
	}
}

func TestCompareDotVersion(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"1.0.0", "1.0.1", -1},
		{"1.0.1", "1.0.0", 1},
		{"1.2", "1.2.0", 0},
		{"131.0.2903.112", "131.0.2903.99", 1},
		{"109.0.1518.78", "131.0.2903.0", -1},
		{"109.0.1518.78", "155.0.4283.45", -1},
		{"155.0.4283.45", "1.3.275.13", 1}, // registry pv vs Edge Update FileVersion — khong dung FileVersion de pin
	}
	for _, c := range cases {
		got := CompareDotVersion(c.a, c.b)
		if got != c.want {
			t.Errorf("CompareDotVersion(%q,%q)=%d want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestPlanDep(t *testing.T) {
	if PlanDep("", "131.0.0") != DepInstall {
		t.Fatal("missing")
	}
	if PlanDep("109.0.0", "131.0.0") != DepUpgrade {
		t.Fatal("older")
	}
	if PlanDep("131.0.0", "131.0.0") != DepSkip {
		t.Fatal("equal")
	}
	if PlanDep("140.0.0", "131.0.0") != DepSkip {
		t.Fatal("newer must not downgrade")
	}
}

func TestDepConfirmMessage(t *testing.T) {
	miss := DepConfirmMessage("WebView2", "", "131.0.2903.0", DepInstall)
	if miss == "" || !containsAll(miss, "chua co", "131.0.2903.0") {
		t.Fatalf("install msg: %q", miss)
	}
	up := DepConfirmMessage("WebView2", "109.0.0", "131.0.2903.0", DepUpgrade)
	if up == "" || !containsAll(up, "109.0.0", "131.0.2903.0", "cai de") {
		t.Fatalf("upgrade msg: %q", up)
	}
	if DepConfirmMessage("WebView2", "140.0.0", "131.0.0", DepSkip) != "" {
		t.Fatal("skip has no prompt")
	}
}

func TestApplyDepConsent(t *testing.T) {
	miss := ApplyDepConsent(DepInstall, false)
	if miss.Abort == nil || miss.Install {
		t.Fatal("refuse missing must abort")
	}
	if !ApplyDepConsent(DepInstall, true).Install {
		t.Fatal("accept missing installs")
	}
	refUp := ApplyDepConsent(DepUpgrade, false)
	if refUp.Abort != nil || refUp.Install {
		t.Fatal("refuse upgrade continues without install")
	}
	if !ApplyDepConsent(DepUpgrade, true).Install {
		t.Fatal("accept upgrade installs")
	}
	if ApplyDepConsent(DepSkip, true).Install {
		t.Fatal("skip never installs")
	}
}

func TestNormalizeWebView2PV(t *testing.T) {
	if NormalizeWebView2PV("0.0.0.0") != "" {
		t.Fatal("placeholder")
	}
	if NormalizeWebView2PV(" 131.0.1 ") != "131.0.1" {
		t.Fatal("trim")
	}
}

func TestResolvePinnedFileAndHash(t *testing.T) {
	dir := t.TempDir()
	name := "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte("wv2"), 0o644); err != nil {
		t.Fatal(err)
	}
	dep := PinnedDep{File: name, SHA256: ""}
	got, err := ResolvePinnedFile(dir, dep)
	if err != nil || got != p {
		t.Fatalf("got %s err %v", got, err)
	}
	sum, err := FileSHA256(p)
	if err != nil || len(sum) != 64 {
		t.Fatalf("hash %s %v", sum, err)
	}
	if err := VerifySHA256(p, sum); err != nil {
		t.Fatal(err)
	}
	if err := VerifySHA256(p, "deadbeef"); err == nil {
		t.Fatal("want mismatch")
	}
	if _, err := ResolvePinnedFile(dir, PinnedDep{File: "missing.exe"}); err == nil {
		t.Fatal("missing payload")
	}
}

func TestLoadDepsJSON(t *testing.T) {
	raw := []byte(`{
	  "webview2": {
	    "name": "WebView2 Runtime",
	    "version": "131.0.2903.112",
	    "file": "MicrosoftEdgeWebView2RuntimeInstallerX64.exe",
	    "sha256": "abc",
	    "source": "https://go.microsoft.com/fwlink/?linkid=2124701"
	  }
	}`)
	d, err := LoadDepsJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if d.WebView2.Version != "131.0.2903.112" || d.WebView2.File == "" {
		t.Fatalf("%+v", d.WebView2)
	}
	if _, err := LoadDepsJSON([]byte(`{"webview2":{"file":"x.exe"}}`)); err == nil {
		t.Fatal("empty version must fail")
	}
}

func TestVendoredDepsJSONIsRuntimeVersion(t *testing.T) {
	p := filepath.Join(repoRoot(t), "installer", "payload", "deps.json")
	d, err := LoadDepsFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if CompareDotVersion(d.WebView2.Version, "80.0.0") < 0 {
		t.Fatalf("pin must be WebView2 Runtime (155.x), not Edge Update Setup: %s", d.WebView2.Version)
	}
	if d.WebView2.File != "MicrosoftEdgeWebView2RuntimeInstallerX64.exe" || d.WebView2.SHA256 == "" {
		t.Fatalf("%+v", d.WebView2)
	}
}

func containsAll(s string, parts ...string) bool {
	for _, p := range parts {
		if !containsFold(s, p) {
			return false
		}
	}
	return true
}

func containsFold(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || indexFold(s, sub) >= 0)
}

func indexFold(s, sub string) int {
	ls, lsub := len(s), len(sub)
	for i := 0; i+lsub <= ls; i++ {
		ok := true
		for j := 0; j < lsub; j++ {
			a, b := s[i+j], sub[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				ok = false
				break
			}
		}
		if ok {
			return i
		}
	}
	return -1
}

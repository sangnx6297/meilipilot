package vault

import "testing"

func TestOSRoundtrip(t *testing.T) {
	p := NewOS()
	sealed, err := p.Seal([]byte("super-secret-key-xyz"))
	if err != nil {
		t.Fatal(err)
	}
	if string(sealed) == "super-secret-key-xyz" {
		t.Fatal("seal returned plaintext")
	}
	got, err := p.Open(sealed)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "super-secret-key-xyz" {
		t.Fatalf("got %q", got)
	}
}

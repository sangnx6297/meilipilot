package installwin

import "testing"

func TestPowershellQuote(t *testing.T) {
	if powershellQuote(`C:\a b`) != `'C:\a b'` {
		t.Fatal(powershellQuote(`C:\a b`))
	}
	if powershellQuote(`it's`) != `'it''s'` {
		t.Fatal(powershellQuote(`it's`))
	}
}

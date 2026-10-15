//go:build !windows

package vault

type osProtector struct{}

func xor(in []byte) []byte {
	out := make([]byte, len(in))
	for i, b := range in {
		out[i] = b ^ 0x5a
	}
	return out
}

func (osProtector) Seal(plain []byte) ([]byte, error) { return xor(plain), nil }
func (osProtector) Open(sealed []byte) ([]byte, error) { return xor(sealed), nil }

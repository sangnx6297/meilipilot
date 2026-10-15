package vault

type Protector interface {
	Seal(plain []byte) ([]byte, error)
	Open(sealed []byte) ([]byte, error)
}

func NewOS() Protector {
	return osProtector{}
}

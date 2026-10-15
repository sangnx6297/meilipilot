package installwin

import "testing"

func TestPickGoWindowsMSI(t *testing.T) {
	body := []byte(`[
	  {"version":"go1.25.3","stable":true,"files":[
	    {"filename":"go1.25.3.windows-amd64.msi","os":"windows","arch":"amd64","kind":"msi"}
	  ]}
	]`)
	ver, file, err := PickGoWindowsMSI(body)
	if err != nil {
		t.Fatal(err)
	}
	if ver != "go1.25.3" || file != "go1.25.3.windows-amd64.msi" {
		t.Fatalf("%s %s", ver, file)
	}
	if GoDownloadURL(file) != "https://go.dev/dl/go1.25.3.windows-amd64.msi" {
		t.Fatal(GoDownloadURL(file))
	}
}

func TestPickNodeLTS(t *testing.T) {
	body := []byte(`[
	  {"version":"v23.0.0","lts":false},
	  {"version":"v22.11.0","lts":"Jod"}
	]`)
	ver, err := PickNodeLTS(body)
	if err != nil || ver != "v22.11.0" {
		t.Fatalf("%s %v", ver, err)
	}
	want := "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"
	if NodeMSIURL(ver) != want {
		t.Fatal(NodeMSIURL(ver))
	}
}

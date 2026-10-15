package installwin

import (
	"encoding/json"
	"fmt"
	"strings"
)

type goDLFile struct {
	Filename string `json:"filename"`
	OS       string `json:"os"`
	Arch     string `json:"arch"`
	Kind     string `json:"kind"`
}

type goDLRelease struct {
	Version string    `json:"version"`
	Stable  bool      `json:"stable"`
	Files   []goDLFile `json:"files"`
}

type nodeDist struct {
	Version string      `json:"version"`
	LTS     interface{} `json:"lts"`
}

func PickGoWindowsMSI(jsonBody []byte) (version, filename string, err error) {
	var rels []goDLRelease
	if err := json.Unmarshal(jsonBody, &rels); err != nil {
		return "", "", err
	}
	for _, r := range rels {
		if !r.Stable {
			continue
		}
		for _, f := range r.Files {
			if f.OS == "windows" && f.Arch == "amd64" && f.Kind == "msi" {
				return r.Version, f.Filename, nil
			}
		}
	}
	return "", "", fmt.Errorf("no stable windows/amd64 go msi")
}

func GoDownloadURL(filename string) string {
	return "https://go.dev/dl/" + filename
}

func PickNodeLTS(jsonBody []byte) (version string, err error) {
	var rows []nodeDist
	if err := json.Unmarshal(jsonBody, &rows); err != nil {
		return "", err
	}
	for _, r := range rows {
		if isLTS(r.LTS) {
			return r.Version, nil
		}
	}
	return "", fmt.Errorf("no node lts in index")
}

func isLTS(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return t != ""
	default:
		return false
	}
}

func NodeMSIURL(version string) string {
	v := strings.TrimPrefix(version, "v")
	return fmt.Sprintf("https://nodejs.org/dist/v%s/node-v%s-x64.msi", v, v)
}

const WebView2BootstrapURL = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

package proxy

import (
	"net/http"
	"regexp"
	"strings"
)

var readPostPaths = []*regexp.Regexp{
	regexp.MustCompile(`^/indexes/[^/]+/search$`),
	regexp.MustCompile(`^/indexes/[^/]+/facet-search$`),
	regexp.MustCompile(`^/indexes/[^/]+/similar$`),
	regexp.MustCompile(`^/indexes/[^/]+/documents/fetch$`),
	regexp.MustCompile(`^/multi-search$`),
	regexp.MustCompile(`^/logs/stream$`),
	regexp.MustCompile(`^/render-template$`),
}

func IsReadRequest(method, path string) bool {
	m := strings.ToUpper(method)
	if m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions {
		return true
	}
	if m != http.MethodPost {
		return false
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	path = strings.TrimSuffix(path, "/")
	for _, re := range readPostPaths {
		if re.MatchString(path) {
			return true
		}
	}
	return false
}

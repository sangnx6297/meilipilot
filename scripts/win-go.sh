#!/usr/bin/env bash
set -euo pipefail
winroot="$1"
shift
cmd.exe /c "cd /d ${winroot} && go $*"

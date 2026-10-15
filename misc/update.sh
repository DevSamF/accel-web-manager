#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo accel-web-manager-update" >&2
    exit 1
fi

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
command -v apt-get >/dev/null || { echo "This updater supports Debian and Ubuntu" >&2; exit 1; }

release_api="https://api.github.com/repos/svlobanov/accel-web-manager/releases/latest"
deb_url="$(curl -fsSL -H 'Accept: application/vnd.github+json' -H 'User-Agent: accel-web-manager-updater' "$release_api" \
    | python3 -c 'import json,sys; r=json.load(sys.stdin); print(next((a["browser_download_url"] for a in r.get("assets",[]) if a["name"].endswith("_all.deb")), ""))')"
if [ -z "$deb_url" ]; then
    echo "The latest GitHub release has no Debian package asset" >&2
    exit 1
fi

tmp_deb="$(mktemp --suffix=.deb /tmp/accel-web-manager.XXXXXX)"
trap 'rm -f "$tmp_deb"' EXIT
apt-get update
curl -fL "$deb_url" -o "$tmp_deb"
apt-get install -y "$tmp_deb"
systemctl restart accel-web-manager
systemctl --no-pager --full status accel-web-manager
echo "accel-web-manager is updated."

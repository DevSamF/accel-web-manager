#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run this installer with sudo, for example: curl -fsSL https://raw.githubusercontent.com/DevSamF/accel-web-manager/main/misc/install.sh | sudo bash" >&2
    exit 1
fi
if [ ! -r /etc/os-release ]; then
    echo "Cannot identify this Linux distribution" >&2
    exit 1
fi
. /etc/os-release
case "${ID:-}" in
    debian|ubuntu) ;;
    *) echo "Supported distributions: Debian and Ubuntu" >&2; exit 1 ;;
esac

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl python3 nginx apache2-utils

script_tmp="$(mktemp /tmp/accel-web-manager-install.XXXXXX)"
trap 'rm -f "$script_tmp"' EXIT
curl -fsSL https://raw.githubusercontent.com/DevSamF/accel-web-manager/main/misc/update.sh -o "$script_tmp"
bash "$script_tmp"
install -m 0755 "$script_tmp" /usr/bin/accel-web-manager-update

site=/etc/nginx/sites-enabled/accel-web-manager
if [ -L "$site" ]; then
    :
elif [ -e "$site" ]; then
    echo "A file already exists at $site; enable the site manually after checking it" >&2
    exit 1
else
    ln -s ../sites-available/accel-web-manager "$site"
fi
password_file=/var/lib/accel-web-manager/nginx/users.htpasswd
if htpasswd -vb "$password_file" admin accel >/dev/null 2>&1; then
    password="$(python3 -c 'import secrets; print(secrets.token_urlsafe(18))')"
    htpasswd -b "$password_file" admin "$password" >/dev/null
    printf '\nFirst-login credentials\nUsername: admin\nPassword: %s\n\n' "$password"
fi
nginx -t
systemctl enable --now nginx
systemctl reload nginx
echo "Installation complete. Open http://<server-address>:8018/"
echo "For future upgrades run: sudo accel-web-manager-update"


#!/usr/bin/env bash

set -e

# Run this script from root folder
REPO_ROOT=`git rev-parse --show-toplevel`
VERSION=`git rev-parse --short HEAD`
DIR0="build/release-${VERSION}"
DIR="build/release-${VERSION}/accel-web-manager"

mkdir -pv build
rm -rfv "$DIR0"
mkdir -pv "$DIR0"
mkdir -pv "$DIR"

# Frontend
cd frontend
npm install
GENERATE_SOURCEMAP=false npm run build
cd ..
cp -Rpv frontend/build "${DIR}/frontend"

# Backend
mkdir -pv "${DIR}/backend"
cp -pv backend/*.py "${DIR}/backend"

# Systemd unit
cp -Rpv misc/systemd "${DIR}/systemd"

# Nginx config
cp -Rpv misc/nginx "${DIR}/nginx"

# Doc
cp -v README.md "${DIR}/"

# Build archive
cd "${DIR0}"
TAR=tar
gtar --version 2>/dev/null 1>/dev/null && TAR=gtar # workaround for macos
$TAR --owner root:0 --group root:0 -Jcf accel-web-manager-$VERSION.txz accel-web-manager/ || \
    echo "ERROR: Please install gnu tar (gtar)"

# Build deb. Keep this in sync with the package metadata and frontend version.
UPSTREAM_VERSION=`sed -n 's/^Version: *//p' "${REPO_ROOT}/misc/release-scripts/DEBIAN/control" | head -n 1`
if [ -z "$UPSTREAM_VERSION" ]; then
    echo "ERROR: Version is missing from ${REPO_ROOT}/misc/release-scripts/DEBIAN/control" >&2
    exit 1
fi
DEBIAN_VERSION="1"
DEBPKG_VERSION="${UPSTREAM_VERSION}-${DEBIAN_VERSION}"
DEB_DIR="deb/accel-web-manager_${DEBPKG_VERSION}"
mkdir -pv "${DEB_DIR}/var/lib"
cp -Rpv accel-web-manager "${DEB_DIR}/var/lib" # copy files prepared for tarball
cp -Rpv ../../misc/release-scripts/DEBIAN "${DEB_DIR}" # copy files for debian package creation
mkdir -pv "${DEB_DIR}/usr/bin"
cp -pv ../../misc/update.sh "${DEB_DIR}/usr/bin/accel-web-manager-update"
chmod 0755 "${DEB_DIR}/usr/bin/accel-web-manager-update"
sed -i.bak "s/^Version: .*/Version: ${DEBPKG_VERSION}/" "${DEB_DIR}/DEBIAN/control"
rm -f "${DEB_DIR}/DEBIAN/control.bak"
mkdir -pv "${DEB_DIR}/lib/systemd/system"
mv -v "${DEB_DIR}/var/lib/accel-web-manager/systemd/accel-web-manager.service" "${DEB_DIR}/lib/systemd/system/"
rm -rfv "${DEB_DIR}/var/lib/accel-web-manager/systemd"
ls -1 "${DEB_DIR}/var/lib/accel-web-manager/backend" | grep settings | awk '{print "/var/lib/accel-web-manager/backend/"$1}' >> \
    "${DEB_DIR}/DEBIAN/conffiles" # add backend config files to deb conffiles list
mkdir -pv "${DEB_DIR}/etc/nginx/sites-available"
ln -s "/var/lib/accel-web-manager/nginx/accel-web-manager" "${DEB_DIR}/etc/nginx/sites-available/accel-web-manager"

dpkg-deb --root-owner-group --build "${DEB_DIR}"
mv -v "${DEB_DIR}.deb" "accel-web-manager_${DEBPKG_VERSION}_all.deb"

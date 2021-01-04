#!/bin/bash

set -xe

build_name="${1:-pwt}"
build=build/${build_name}

# set up rlyeh
#
# archive paths
#
backend_share=${build}/usr/share/rlyeh
backend_dist=${backend_share}/frontend/dist
backend_units=${build}/etc/systemd/system

backend_dist_srcdir=rlyeh/misc/dist

if [[ ! -e "${backend_dist_srcdir}/cthulhu.tar" ]]; then
    echo "missing rlyeh dist.tar"
    exit 1
fi

mkdir -p ${build}
mkdir -p ${backend_share}
mkdir -p ${backend_units}

cp rlyeh/{rlyeh,rlyeh.py} ${backend_share}
cp -R rlyeh/cephadm ${backend_share}
mkdir -p ${backend_share}/frontend/dist/cthulhu
tar -C ${backend_dist} -xvf ${backend_dist_srcdir}/cthulhu.tar

[[ ! -e "${backend_dist}/cthulhu" ]] && \
    echo "missing cthulhu dist files" && \
    exit 1

cp -R rlyeh/misc/systemd/rlyeh.service ${backend_units}

tar -C ${build} -cvf ${build}/rlyeh.tar etc/ usr/

mkdir ${build} || true
cp microOS/config.{sh,xml} ${build}/

[[ -e ${build}/rlyeh.tar ]] || exit 1

mkdir ${build}/{_out,_logs}
sudo kiwi-ng --debug --profile=Ceph-Vagrant --type oem \
  system build --description $(pwd)/${build} \
  --target-dir $(pwd)/${build}/_out |\
  tee $(pwd)/${build}/_logs/${build_name}-build.log


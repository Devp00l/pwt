#!/bin/bash

set -xe

# set up cthulhu archive
#
cthulhu_share=usr/share/cthulhu
cthulhu_etc=etc/systemd/system
cthulhu_build=build/cthulhu

dist="https://github.com/jecluis/project-cthulhu-dist/archive/master.zip"

mkdir build
mkdir -p ${cthulhu_build}/${cthulhu_share}/{templates,static}
mkdir -p ${cthulhu_build}/${cthulhu_etc}

cp cthulhu/server/* ${cthulhu_build}/${cthulhu_share}
tar -C ${cthulhu_build}/${cthulhu_share} -xvf cthulhu/dist.tar
cp cthulhu/cthulhu.service ${cthulhu_build}/${cthulhu_etc}

tar -C ${cthulhu_build} -cvf build/cthulhu.tar etc/ usr/

# setup microos kiwi files
#

mkdir build/pwt
cp microOS/config.{sh,xml} build/pwt/
mv build/cthulhu.tar build/pwt

mkdir build/{_out,_logs}
sudo kiwi-ng --debug --profile=Ceph-Vagrant --type oem \
  system build --description $(pwd)/build/pwt --target-dir $(pwd)/build/_out |\
  tee $(pwd)/build/_logs/pwt-build.log


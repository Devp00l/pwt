#!/bin/bash

set -xe

[[ ! -e "frontend/dist" ]] && \
    pushd frontend && \
    npx ng build --outputHashing=all --prod && \
    popd

if ! ls frontend/dist/cthulhu/main.*.js >&/dev/null ; then
    echo "error: frontend not built!"
    exit 1
fi

tar -C frontend/dist -cvf misc/dist/cthulhu.tar cthulhu/


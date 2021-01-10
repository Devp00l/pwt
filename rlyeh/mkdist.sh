#!/bin/bash

set -xe

[[ ! -e "frontend/dist" ]] && \
    pushd frontend && \
    npx ng build && \
    popd

[[ ! -e "frontend/dist/cthulhu/main.js" ]] && \
    echo "error: frontend not built!" && \
    exit 1

tar -C frontend/dist -cvf misc/dist/cthulhu.tar cthulhu/


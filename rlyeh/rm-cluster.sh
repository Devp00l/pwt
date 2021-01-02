#!/bin/bash

for fsid in $(python3 cephadm/cephadm.py ls | \
              grep "fsid" | \
              sed 's/.*: "\([-0-9a-f]\+\).*/\1/' | \
              uniq); do
    echo "> $fsid"
    python3 cephadm/cephadm.py rm-cluster --force --fsid ${fsid}
done


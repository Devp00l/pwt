Project Working Title (very basic) PoC
=======================================


Note before: This is my own attempt at getting to know a few concepts that may
be useful, and is in no way intended as setting a direction for any project
that may or may not exist, now or in the future.


STRUCTURE
----------

We have three main directories:

  1. microOS/, for microOS base files to build an image
  2. cthulhu/, for files required to run a flask server serving
     project-cthulhu (https://github.com/jecluis/project-cthulhu.git)
  3. rlyeh/, for a cephadm-backed backend and frontend that will deploy a
     single-node ceph cluster.
  4. vagrant/, so the generated image can be used


BUILDING
---------

Building requires `kiwi-ng` to be available in the system.

Images can be built using the `build.sh` script. By default, the build will be
named `pwt` and will be available in `build/pwt/`. The script takes an argument
for a build name (e.g., `build.sh pwt-foo`). Images can be found in
`build/<buildname>/_out`.

The script should either be run as root, or the password will be requested at
some point during execution. This is because `kiwi-ng` requires root to work
:shrug:


USAGE
-----

Once the image is up and running, the web server can be found at

  `http://<image-ip>:1337`

If using the provided Vagrantfile, then it can also be found at the
host's port 1337.


LICENSE
--------

This work is distributed under the European Union Public License version 1.2,
as published by the European Commission. You may find a copy of the license in
this repository, under LICENSE.


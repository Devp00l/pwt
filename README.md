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
  3. vagrant/, so the generated image can be used


BUILDING
---------

Building requires `kiwi-ng` to be available in the system.

Running the 'build.sh' script will generate an image in `build/_out`. This
script will, at some point, ask the user for the root password. This is
because `kiwi-ng` requires root to work :shrug:


USAGE
-----

Once the image is up and running, the web server can be found at

  `http://<image-ip>:5000`


LICENSE
--------

This work is distributed under the European Union Public License version 1.2,
as published by the European Commission. You may find a copy of the license in
this repository, under LICENSE.


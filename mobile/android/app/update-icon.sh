#!/bin/bash

cd $(dirname $0)
icon=$(realpath ../../../web/public/favicon.png)

mkdir -p src/main/res/{mipmap-mdpi,mipmap-hdpi,mipmap-xhdpi,mipmap-xxhdpi,mipmap-xxxhdpi}

magick $icon -resize 48x48   src/main/res/mipmap-mdpi/ic_launcher.png
magick $icon -resize 72x72   src/main/res/mipmap-hdpi/ic_launcher.png
magick $icon -resize 96x96   src/main/res/mipmap-xhdpi/ic_launcher.png
magick $icon -resize 144x144 src/main/res/mipmap-xxhdpi/ic_launcher.png
magick $icon -resize 192x192 src/main/res/mipmap-xxxhdpi/ic_launcher.png

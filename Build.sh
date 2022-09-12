#!/bin/sh

rm -rf ./public
node ./Gen.js
cp ./Data.json ./public/
cp ./Assets/* ./public/

cat > ./public/robots.txt << [EOF]
User-agent: *
Disallow: /
[EOF]

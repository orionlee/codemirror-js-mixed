#!/bin/sh

PORT_TO_USE=7654

echo Open the URL:
echo http://localhost:${PORT_TO_USE}/test/javascript-mixed/runmode.html
echo

static-server -p ${PORT_TO_USE}

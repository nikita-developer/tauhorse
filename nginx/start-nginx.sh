#!/bin/sh
set -eu

RELOAD_SECONDS="${NGINX_RELOAD_SECONDS:-21600}"

reload_loop() {
  while sleep "$RELOAD_SECONDS"; do
    nginx -s reload || true
  done
}

reload_loop &
RELOAD_PID=$!

cleanup() {
  kill "$RELOAD_PID" 2>/dev/null || true
  nginx -s quit 2>/dev/null || true
}
trap cleanup INT TERM EXIT

nginx -g 'daemon off;' &
NGINX_PID=$!
wait "$NGINX_PID"

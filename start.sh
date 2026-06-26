#!/bin/bash
tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &
sleep 2
tailscale up --authkey=${TAILSCALE_AUTHKEY} --hostname=render-proxy
node server.js

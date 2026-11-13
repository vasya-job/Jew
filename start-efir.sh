#!/usr/bin/env bash
# Эфир: HTTP-магазин + DNS (блок рекламы Hisense, имя efir.home)
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-80}"
DNS_PORT="${DNS_PORT:-53}"

if ! python3 -c "import dnslib" 2>/dev/null; then
  echo "Ставлю dnslib…"
  python3 -m pip install --user dnslib
fi

ip=$(ipconfig getifaddr en0 2>/dev/null || true)
[[ -z "${ip}" ]] && ip=$(ipconfig getifaddr en1 2>/dev/null || true)
[[ -z "${ip}" ]] && ip=$(python3 - <<'PY'
import socket
s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
  s.connect(("8.8.8.8",80)); print(s.getsockname()[0])
finally:
  s.close()
PY
)

echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  ЭФИР — DNS + магазин для Hisense       │"
echo "  └─────────────────────────────────────────┘"
echo ""
echo "  1) Оставьте это окно открытым (Mac = сервер)."
echo "  2) На ТВ: Сеть → DNS вручную → ${ip}"
echo "  3) Браузер ТВ → http://efir.home/"
echo "     (или http://${ip}:${PORT}/ )"
echo ""
echo "  Рекламные домены Hisense режутся через DNS."
echo "  Приложения ставятся в магазине Эфира (ярлыки)."
echo ""

# HTTP на 80 тоже часто нужен sudo; если не вышло — 8080
HTTP_PID=""
cleanup() {
  [[ -n "${HTTP_PID}" ]] && kill "${HTTP_PID}" 2>/dev/null || true
}
trap cleanup EXIT

start_http() {
  local p="$1"
  python3 -m http.server "${p}" --bind 0.0.0.0 &
  HTTP_PID=$!
  sleep 0.4
  if ! kill -0 "${HTTP_PID}" 2>/dev/null; then
    HTTP_PID=""
    return 1
  fi
  return 0
}

if [[ "${PORT}" -eq 80 ]]; then
  if ! start_http 80; then
    echo "  Порт 80 занят/нужен пароль — поднимаю 8080"
    PORT=8080
    start_http 8080
  fi
else
  start_http "${PORT}"
fi

echo "  HTTP: http://${ip}:${PORT}/"
echo ""

# DNS :53 почти всегда нужен sudo
if [[ "${DNS_PORT}" -eq 53 ]]; then
  echo "  Для DNS нужен пароль администратора Mac (порт 53)…"
  exec sudo python3 dns_server.py --ip "${ip}" --port 53
else
  exec python3 dns_server.py --ip "${ip}" --port "${DNS_PORT}"
fi

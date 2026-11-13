#!/usr/bin/env bash
# Запуск Эфира в локальной сети — ТВ и Mac в одном Wi‑Fi / Ethernet.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8080}"

ip=$(ipconfig getifaddr en0 2>/dev/null || true)
if [[ -z "${ip}" ]]; then
  ip=$(ipconfig getifaddr en1 2>/dev/null || true)
fi
if [[ -z "${ip}" ]]; then
  ip=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
fi

echo ""
echo "  Эфир слушает порт ${PORT}"
if [[ -n "${ip}" ]]; then
  echo "  На телевизоре откройте в браузере:"
  echo ""
  echo "    http://${ip}:${PORT}/"
  echo ""
else
  echo "  IP не найден — посмотрите адрес Mac в настройках сети."
  echo "  Затем на ТВ: http://ВАШ_IP:${PORT}/"
  echo ""
fi
echo "  Остановка: Ctrl+C"
echo ""

exec python3 -m http.server "${PORT}" --bind 0.0.0.0

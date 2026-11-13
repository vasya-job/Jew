#!/usr/bin/env python3
"""Локальный DNS для Hisense: блок рекламы + магазин Эфир в домашней сети."""

from __future__ import annotations

import argparse
import ipaddress
import socket
import sys
import threading
from pathlib import Path

try:
    from dnslib import QTYPE, RR, A, DNSHeader, DNSRecord
    from dnslib.server import BaseResolver, DNSServer
except ImportError:
    print("Нужен пакет dnslib:  python3 -m pip install --user dnslib", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).resolve().parent
DEFAULT_BLOCKLIST = ROOT / "ads-hisense.txt"
STORE_NAMES = {
    "efir.home",
    "store.efir",
    "tv.efir",
    "efir",
}


def detect_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if not ip.startswith("127."):
            return ip
    except OSError:
        pass
    return "127.0.0.1"


def load_blocklist(path: Path) -> set[str]:
    domains: set[str] = set()
    if not path.exists():
        return domains
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip().lower()
        if not line or line.startswith("#"):
            continue
        domains.add(line.rstrip("."))
    return domains


def is_blocked(name: str, blocked: set[str]) -> bool:
    host = name.lower().rstrip(".")
    if host in blocked:
        return True
    parts = host.split(".")
    for i in range(len(parts) - 1):
        if ".".join(parts[i:]) in blocked:
            return True
    return False


class EfirResolver(BaseResolver):
    def __init__(self, lan_ip: str, blocked: set[str], upstream: str):
        self.lan_ip = lan_ip
        self.blocked = blocked
        self.upstream = upstream
        self.store = {n.lower().rstrip(".") for n in STORE_NAMES}

    def resolve(self, request, handler):
        reply = request.reply()
        qname = str(request.q.qname).rstrip(".")
        qtype = QTYPE[request.q.qtype]

        if qtype in ("A", "AAAA", "ANY"):
            host = qname.lower()
            if host in self.store or host.endswith(".efir.home"):
                if qtype in ("A", "ANY"):
                    reply.add_answer(RR(request.q.qname, QTYPE.A, rdata=A(self.lan_ip), ttl=30))
                return reply
            if is_blocked(host, self.blocked):
                # «Чёрная дыра» для рекламы
                if qtype in ("A", "ANY"):
                    reply.add_answer(RR(request.q.qname, QTYPE.A, rdata=A("0.0.0.0"), ttl=60))
                return reply

        try:
            upstream_req = DNSRecord.parse(request.pack())
            raw = upstream_req.send(self.upstream, port=53, timeout=2.5, tcp=False)
            return DNSRecord.parse(raw)
        except Exception:
            reply.header.rcode = 2  # SERVFAIL
            return reply


def main() -> int:
    parser = argparse.ArgumentParser(description="Эфир DNS для Hisense VIDAA")
    parser.add_argument("--ip", default="", help="LAN IP Mac (по умолчанию авто)")
    parser.add_argument("--port", type=int, default=53, help="Порт DNS (нужен sudo для 53)")
    parser.add_argument("--upstream", default="1.1.1.1", help="Внешний DNS")
    parser.add_argument("--blocklist", default=str(DEFAULT_BLOCKLIST))
    args = parser.parse_args()

    lan_ip = args.ip or detect_lan_ip()
    try:
        ipaddress.IPv4Address(lan_ip)
    except ipaddress.AddressValueError:
        print(f"Некорректный IP: {lan_ip}", file=sys.stderr)
        return 1

    blocked = load_blocklist(Path(args.blocklist))
    resolver = EfirResolver(lan_ip, blocked, args.upstream)
    server = DNSServer(resolver, port=args.port, address="0.0.0.0", tcp=True)
    udp = DNSServer(resolver, port=args.port, address="0.0.0.0", tcp=False)

    print("")
    print("  Эфир DNS запущен")
    print(f"  LAN IP Mac:     {lan_ip}")
    print(f"  DNS порт:       {args.port}")
    print(f"  Блок доменов:   {len(blocked)}")
    print("")
    print("  На Hisense → Сеть → DNS вручную:")
    print(f"    DNS 1: {lan_ip}")
    print("    DNS 2: 1.1.1.1")
    print("")
    print("  Потом в браузере ТВ откройте:")
    print("    http://efir.home/")
    print("    http://store.efir/")
    print("")
    print("  Остановка: Ctrl+C")
    print("")

    udp.start_thread()
    server.start_thread()
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nDNS остановлен")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

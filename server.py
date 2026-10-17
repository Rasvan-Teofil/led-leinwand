#!/usr/bin/env python3
"""Minimal static file server for the LED wall prototype."""
from __future__ import annotations

import os
import socketserver
from http.server import SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", "8080"))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prototype")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self) -> None:
        # ES modules need correct MIME; allow local dev without cache surprises.
        if self.path.endswith(".js"):
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
        elif self.path.endswith(".mjs"):
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    os.chdir(ROOT)
    with ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving LED-Leinwand prototype on http://0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()

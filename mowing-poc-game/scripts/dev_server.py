#!/usr/bin/env python3
"""Static dev server with no-cache headers for local iteration."""

from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=4173)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", default=".")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    handler = functools.partial(NoCacheRequestHandler, directory=args.directory)
    with ThreadingHTTPServer((args.bind, args.port), handler) as httpd:
        print(
            f"Serving {args.directory} on http://{args.bind}:{args.port} "
            "(Cache-Control: no-store)"
        )
        httpd.serve_forever()


if __name__ == "__main__":
    main()

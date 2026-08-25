#!/usr/bin/env python3
"""Serve the MailDev site locally, the way GitHub Pages does.

Clean directory URLs (/mcp/ -> mcp/index.html) work the same as in production,
but nothing is cached — so an edit to index.html or site.css shows up on a
plain reload instead of needing a hard refresh.

Usage: python3 scripts/serve.py [PORT] [--open]
"""

import sys
import webbrowser
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  " + (fmt % args) + "\n")


def main():
    args = sys.argv[1:]
    port = next((int(a) for a in args if a.isdigit()), DEFAULT_PORT)
    url = "http://localhost:%d/" % port

    try:
        httpd = HTTPServer(("127.0.0.1", port), partial(Handler, directory=str(ROOT)))
    except OSError as err:
        sys.exit("Could not bind port %d (%s).\nTry: make serve PORT=%d" % (port, err.strerror, port + 1))

    print("MailDev site → %s  (ctrl-c to stop)" % url)
    if "--open" in args:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()

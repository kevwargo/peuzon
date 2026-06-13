import logging
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = sys.argv[1]
PORT = int(sys.argv[2])

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%Y%m%d-%H%M%S.%f")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        logging.info(f"GET: {self.path}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        payload = self.rfile.read(content_length).decode("utf-8", errors="replace")
        logging.info(f"POST: {self.path}")
        logging.info(f"Payload: {payload}")

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)

    logging.info(f"Listening on http://{HOST}:{PORT}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("Stopping server")
        server.server_close()

"""
Minimal HTTP API for Atina Node (YOUTUBE_PIPELINE_URL).
POST /run  -> enqueue Celery chain, returns { jobId, status }
GET  /health -> { status: ok }
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

from celery import chain

from app.pipeline_tasks import assets_task, beast_task, manager_task, scout_task, voice_task

DEFAULT_PORT = 8090


class PipelineHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path == '/health':
            self._send_json(200, {'status': 'ok', 'service': 'youtube-pipeline'})
            return
        self._send_json(404, {'error': 'not_found'})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path != '/run':
            self._send_json(404, {'error': 'not_found'})
            return

        length = int(self.headers.get('Content-Length', '0') or 0)
        raw = self.rfile.read(length) if length else b'{}'
        try:
            data = json.loads(raw.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            self._send_json(400, {'error': 'invalid_json'})
            return

        result = chain(
            scout_task.s(),
            voice_task.s(),
            assets_task.s(),
            beast_task.s(),
            manager_task.s(),
        ).apply_async()

        self._send_json(
            202,
            {
                'status': 'queued',
                'jobId': result.id,
                'systemId': data.get('systemId'),
                'mode': data.get('mode', 'production'),
            },
        )


def main() -> None:
    import os

    port = int(os.environ.get('PIPELINE_HTTP_PORT', DEFAULT_PORT))
    server = HTTPServer(('0.0.0.0', port), PipelineHandler)
    print(f'youtube-pipeline HTTP listening on :{port}')
    server.serve_forever()


if __name__ == '__main__':
    main()

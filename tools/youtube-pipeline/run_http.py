"""Start HTTP API for Atina Node integration. Requires Redis + Celery worker."""

from app.http_api import main

if __name__ == '__main__':
    main()

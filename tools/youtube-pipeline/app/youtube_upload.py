"""YouTube Data API v3 upload hook (optional — skipped when OAuth env is missing)."""

from __future__ import annotations

import os
from typing import Any


def _credentials_present() -> bool:
    return bool(
        os.getenv('YOUTUBE_CLIENT_ID', '').strip()
        and os.getenv('YOUTUBE_CLIENT_SECRET', '').strip()
        and os.getenv('YOUTUBE_REFRESH_TOKEN', '').strip()
    )


def upload_video_if_configured(job: dict[str, Any]) -> dict[str, Any]:
    output_path = job.get('output_path') or ''
    if not output_path:
        job['youtube_upload'] = {'status': 'skipped', 'reason': 'no_output_path'}
        return job

    if not _credentials_present():
        job['youtube_upload'] = {
            'status': 'skipped',
            'reason': 'not_configured',
            'message': 'Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN',
        }
        return job

    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        job['youtube_upload'] = {
            'status': 'skipped',
            'reason': 'missing_dependency',
            'message': 'pip install google-api-python-client google-auth-oauthlib',
        }
        return job

    creds = Credentials(
        None,
        refresh_token=os.environ['YOUTUBE_REFRESH_TOKEN'],
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.environ['YOUTUBE_CLIENT_ID'],
        client_secret=os.environ['YOUTUBE_CLIENT_SECRET'],
    )
    youtube = build('youtube', 'v3', credentials=creds)

    title = job.get('title') or 'ATINA OmniTube upload'
    body: dict[str, Any] = {
        'snippet': {'title': title, 'description': job.get('script', '')[:5000]},
        'status': {'privacyStatus': os.getenv('YOUTUBE_PRIVACY_STATUS', 'private')},
    }
    media = MediaFileUpload(output_path, mimetype='video/mp4', resumable=True)
    request = youtube.videos().insert(part='snippet,status', body=body, media_body=media)
    response = request.execute()
    job['youtube_upload'] = {
        'status': 'uploaded',
        'video_id': response.get('id'),
        'privacy': body['status']['privacyStatus'],
    }
    return job

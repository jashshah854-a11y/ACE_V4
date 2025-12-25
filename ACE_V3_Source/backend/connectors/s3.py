from __future__ import annotations

from pathlib import Path
from typing import Dict

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None

from .base import ConnectorResult, SourceConnector, ensure_output_path


class S3Connector(SourceConnector):
    """Download the newest object from an S3 bucket/prefix."""

    def pull(self) -> ConnectorResult:
        if boto3 is None:
            raise RuntimeError('boto3 is required for the S3 connector')

        bucket = self.options.get('bucket')
        prefix = self.options.get('prefix', '')
        pattern = self.options.get('pattern')
        if not bucket:
            raise ValueError('S3 connector requires "bucket" option')

        session_kwargs: Dict[str, str] = {}
        profile = self.options.get('profile') or self.options.get('aws_profile')
        if profile:
            session_kwargs['profile_name'] = profile
        region = self.options.get('region')
        if region:
            session_kwargs['region_name'] = region

        session = boto3.Session(**session_kwargs)
        client = session.client('s3')
        paginator = client.get_paginator('list_objects_v2')
        latest_obj = None
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if pattern and not Path(key).match(pattern):
                    continue
                if latest_obj is None or obj['LastModified'] > latest_obj['LastModified']:
                    latest_obj = obj
        if not latest_obj:
            raise FileNotFoundError('No S3 objects matched criteria')

        key = latest_obj['Key']
        filename = Path(key).name or 'dataset.csv'
        target_dir = Path(self.options.get('output_dir', 'data/uploads/connectors')).resolve()
        target_path = ensure_output_path(target_dir, self.name, filename)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        tmp_dir = Path(self.options.get('tmp_dir', target_dir))
        tmp_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = tmp_dir / f'.{self.name}_{filename}.part'
        client.download_file(bucket, key, str(tmp_path))
        tmp_path.replace(target_path)

        metadata = {
            'bucket': bucket,
            'key': key,
            'prefix': prefix,
        }
        return ConnectorResult(file_path=target_path, metadata=metadata, connector_name=self.name)

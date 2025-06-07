#!/usr/bin/env python3

import boto3
import json
import re
import os

# R2 credentials from env vars
ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
SECRET_KEY = os.getenv("R2_SECRET_KEY")
ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
BUCKET = "photography"

# R2 endpoint
ENDPOINT_URL = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
CDN_DOMAIN = "cdn.tpanetti.com"

# Create S3 client
s3 = boto3.client(
    's3',
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

# Build manifest
manifest = []

paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=BUCKET, Prefix=''):
    for obj in page.get('Contents', []):
        key = obj['Key']

        # Skip non-photo files if desired
        if not key.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue

        # Expect key format: year/location/file
        m = re.match(r'(\d{4})/([^/]+)/([^/]+)$', key)
        if m:
            year, location, filename = m.groups()
            entry = {
                "year": year,
                "location": location,
                "file": filename,
                "path": key,
                "url": f"https://{CDN_DOMAIN}/{key}"
            }
            manifest.append(entry)
        else:
            print(f"Skipping unexpected key format: {key}")

# Write manifest
with open("manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print(f"Generated manifest with {len(manifest)} entries.")


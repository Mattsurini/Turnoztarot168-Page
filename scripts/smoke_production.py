#!/usr/bin/env python3
import json, sys, urllib.error, urllib.request

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'https://boom-reading.vercel.app'
checks = [
    ('homepage', '/', 200),
    ('booking', '/booking.html', 200),
    ('status_page', '/reading-status.html', 200),
    ('packages', '/api/packages', 200),
    ('health', '/api/health', 200),
    ('missing_queue', '/api/reading-status?queueCode=BR-9999', 404),
    ('invalid_queue', '/api/reading-status?queueCode=BAD', 400),
]
results = []
for name, path, expected in checks:
    try:
        with urllib.request.urlopen(BASE + path, timeout=30) as response:
            actual = response.status
            body = response.read(200).decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        actual = error.code
        body = error.read(200).decode('utf-8', 'replace')
    ok = actual == expected
    results.append({'name': name, 'expected': expected, 'actual': actual, 'ok': ok, 'body': body[:120]})

try:
    packages = next(x for x in results if x['name'] == 'packages')
    if packages['ok']:
        data = json.loads(urllib.request.urlopen(BASE + '/api/packages', timeout=30).read())
        packages['groups'] = len(data.get('groups', []))
        packages['items'] = sum(len(group.get('items', [])) for group in data.get('groups', []))
        packages['ok'] = packages['groups'] == 5 and packages['items'] == 17
except Exception as error:
    packages['ok'] = False
    packages['error'] = str(error)

print(json.dumps({'base': BASE, 'ok': all(item['ok'] for item in results), 'checks': results}, ensure_ascii=False, indent=2))
sys.exit(0 if all(item['ok'] for item in results) else 1)

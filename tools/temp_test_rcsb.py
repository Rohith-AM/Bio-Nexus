import urllib.request
url = 'https://www.rcsb.org/pdb/rest/customReport?pdbids=all&customReportColumns=structureId,structureTitle&format=csv'
req = urllib.request.Request(url, headers={'User-Agent': 'Python test'})
with urllib.request.urlopen(req, timeout=20) as resp:
    print(resp.status)
    print(resp.read(200).decode('utf-8'))

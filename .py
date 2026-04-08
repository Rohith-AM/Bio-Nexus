# First, install this: pip install libzim

from libzim.reader import Archive

# நம்ம ஃபைலை லோட் பண்றோம்
zim = Archive("bio-nexus-teal.vercel.app_84ebf48a.zim")

# உள்ளே எவ்ளோ ஃபைல்ஸ் (Articles) இருக்குனு பார்ப்போம்
print(f"Total Entries: {zim.entry_count}")

# முதல் 10 ஃபைல்ஸோட பேரை மட்டும் லிஸ்ட் பண்ணுவோம்
for i in range(10):
    entry = zim._get_entry_by_index(i)
    print(f"📁 Path: {entry.path} | Size: {entry.size} bytes")

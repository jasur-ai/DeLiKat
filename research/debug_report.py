#!/usr/bin/env python3
"""Debug script to find why content_html is empty"""
import sys, os
sys.path.insert(0, '.')
from generate_report import get_section_files, md_to_html, sanitize_id

# Get all sections
sections = get_section_files()
print(f"=== SECTIONS FOUND: {len(sections)} ===")

# Check what sections look like
for i, sec in enumerate(sections[:5]):
    print(f"\n--- Section {i}: id={sec['id']}")
    print(f"  title={sec['title'][:50]}")
    print(f"  file={sec['file']}")
    content = sec.get('content', '')
    print(f"  content length={len(content)}")
    print(f"  content preview={content[:100]}")

# Check if content exists for later sections
print(f"\n=== TOTAL CONTENT CHARS ===")
total = sum(len(sec.get('content', '')) for sec in sections)
print(f"Total: {total} chars across {len(sections)} files")

# Try md_to_html on a sample
if sections:
    sample = sections[0]['content']
    html = md_to_html(sample)
    print(f"\n=== HTML CONVERSION TEST ===")
    print(f"Input: {len(sample)} chars")
    print(f"Output: {len(html)} chars")
    print(f"Output preview: {html[:200]}")

# Check the generate_html function would produce content
content_html = []
for sec in sections[:3]:
    sec_id = sanitize_id(sec['id'])
    html_content = md_to_html(sec['content'])
    file_name = os.path.basename(sec['file'])
    entry = f'<div id="section-{sec_id}">{file_name}: {len(html_content)} chars</div>'
    content_html.append(entry)

print(f"\n=== CONTENT HTML TEST ===")
print(f"Items: {len(content_html)}")
print(f"Joined: {''.join(content_html)[:200]}")

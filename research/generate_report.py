#!/usr/bin/env python3
"""
DeLiKet — Unified HTML Report Generator v2
F-string muammosi tuzatildi. .format() bilan ishlaydi.
"""

import os
import re
import html
from datetime import datetime

REPORT_DIR = "."

# ============================================================
# MARKDOWN -> HTML CONVERTER
# ============================================================

def md_to_html(text):
    lines = text.split('\n')
    html_lines = []
    in_table = False
    in_code = False
    code_buffer = []
    in_list_ul = False
    in_list_ol = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Code block
        if line.startswith('```'):
            if in_code:
                html_lines.append('<pre class="code-block"><code>' + ''.join(code_buffer) + '</code></pre>')
                code_buffer = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buffer.append(html.escape(line) + '\n')
            i += 1
            continue
        
        # Close list if needed
        if in_list_ul and not (line.strip().startswith('- ') or line.strip().startswith('* ')):
            html_lines.append('</ul>')
            in_list_ul = False
        if in_list_ol and not (line.strip() and line.strip()[0].isdigit() and '. ' in line.strip()[:4]):
            html_lines.append('</ol>')
            in_list_ol = False
        
        # Close table if needed
        if in_table and (not line.strip() or '|' not in line):
            html_lines.append('</table>')
            in_table = False
        
        # Empty line
        if not line.strip():
            html_lines.append('')
            i += 1
            continue
        
        # Headers
        if line.startswith('###### '):
            html_lines.append('<h6>' + html.escape(line[7:]) + '</h6>')
        elif line.startswith('##### '):
            html_lines.append('<h5>' + html.escape(line[6:]) + '</h5>')
        elif line.startswith('#### '):
            html_lines.append('<h4>' + html.escape(line[5:]) + '</h4>')
        elif line.startswith('### '):
            html_lines.append('<h3>' + html.escape(line[4:]) + '</h3>')
        elif line.startswith('## '):
            html_lines.append('<h2>' + html.escape(line[3:]) + '</h2>')
        elif line.startswith('# '):
            html_lines.append('<h1>' + html.escape(line[2:]) + '</h1>')
        
        # Table
        elif '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.split('|')[1:-1]]
            if not in_table:
                in_table = True
                html_lines.append('<table class="data-table">')
            
            # Skip separator rows
            if all(re.match(r'^[-:\s]+$', c) for c in cells if c):
                i += 1
                continue
            
            # Check if previous line was separator (header detection)
            is_header = False
            if i > 0 and re.match(r'^[\s|:-]+$', lines[i-1]):
                is_header = True
            
            tag = 'th' if is_header else 'td'
            html_lines.append('<tr>')
            for c in cells:
                c_escaped = html.escape(c)
                c_escaped = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', c_escaped)
                html_lines.append('<' + tag + '>' + c_escaped + '</' + tag + '>')
            html_lines.append('</tr>')
        
        # Horizontal rule
        elif line.strip() == '---':
            html_lines.append('<hr class="section-divider">')
        
        # Unordered list
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            if not in_list_ul:
                in_list_ul = True
                html_lines.append('<ul>')
            txt = html.escape(line.strip()[2:])
            txt = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', txt)
            html_lines.append('<li>' + txt + '</li>')
        
        # Ordered list
        elif line.strip() and line.strip()[0].isdigit() and '. ' in line.strip()[:4]:
            if not in_list_ol:
                in_list_ol = True
                html_lines.append('<ol>')
            txt = line.strip().split('. ', 1)[1] if '. ' in line.strip() else line.strip()
            txt = html.escape(txt)
            txt = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', txt)
            html_lines.append('<li>' + txt + '</li>')
        
        # Regular paragraph
        else:
            txt = html.escape(line)
            txt = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', txt)
            txt = re.sub(r'`([^`]+)`', r'<code>\1</code>', txt)
            html_lines.append('<p>' + txt + '</p>')
        
        i += 1
    
    # Close remaining tags
    if in_table:
        html_lines.append('</table>')
    if in_list_ul:
        html_lines.append('</ul>')
    if in_list_ol:
        html_lines.append('</ol>')
    
    return '\n'.join(html_lines)


def sanitize_id(text):
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text.strip())
    return text.lower()


def get_section_files():
    sections = []
    
    # EXECUTIVE SUMMARY
    exec_path = os.path.join(REPORT_DIR, 'EXECUTIVE-SUMMARY.md')
    if os.path.exists(exec_path):
        with open(exec_path, 'r', encoding='utf-8') as f:
            content = f.read()
        sections.append({
            'id': 'executive-summary',
            'title': 'EXECUTIVE SUMMARY',
            'file': exec_path,
            'content': content,
            'order': -10,
            'category': 'main'
        })
    
    # STRATEGY-XARITA
    strategy_path = os.path.join(REPORT_DIR, 'STRATEGY-XARITA.md')
    if os.path.exists(strategy_path):
        with open(strategy_path, 'r', encoding='utf-8') as f:
            content = f.read()
        sections.append({
            'id': 'strategy',
            'title': 'STRATEGIYA XARITASI',
            'file': strategy_path,
            'content': content,
            'order': 0,
            'category': 'main'
        })
    
    # TAHLIL INDEX
    index_path = os.path.join(REPORT_DIR, 'week1', 'tahlil', 'TAHLIL-INDEX.md')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        sections.append({
            'id': 'tahlil-index',
            'title': 'TAHLIL INDEX',
            'file': index_path,
            'content': content,
            'order': 50,
            'category': 'main'
        })
    
    # CLAUDE INDEX
    claude_index = os.path.join(REPORT_DIR, 'claude-tahlil', 'CLAUDE-INDEX.md')
    if os.path.exists(claude_index):
        with open(claude_index, 'r', encoding='utf-8') as f:
            content = f.read()
        sections.append({
            'id': 'claude-index',
            'title': 'CLAUDE INDEX',
            'file': claude_index,
            'content': content,
            'order': 55,
            'category': 'main'
        })
    
    # Week 1 — Buffy tahillari
    tahlil_dir = os.path.join(REPORT_DIR, 'week1', 'tahlil')
    if os.path.exists(tahlil_dir):
        for root, dirs, files in os.walk(tahlil_dir):
            for f in sorted(files):
                if f.endswith('.md') and f != 'TAHLIL-INDEX.md':
                    fpath = os.path.join(root, f)
                    section_name = os.path.basename(os.path.dirname(fpath))
                    sec_id = 'w1-' + section_name + '-' + f.replace('.md', '')
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': 'W1/' + section_name + '/' + f.replace('.md', '').replace('-', ' ').title(),
                        'file': fpath,
                        'content': content,
                        'order': 100,
                        'category': 'week1'
                    })
    
    # SWOT tahlillari
    swot_dir = os.path.join(REPORT_DIR, 'swot-tahlil')
    if os.path.exists(swot_dir):
        for root, dirs, files in os.walk(swot_dir):
            for f in sorted(files):
                if f.endswith('.md'):
                    fpath = os.path.join(root, f)
                    if f == 'SWOT-INDEX.md':
                        sec_id = 'swot-index'
                        title = 'SWOT INDEX'
                    else:
                        section_name = os.path.basename(os.path.dirname(fpath))
                        sec_id = 'swot-' + section_name
                        title = 'SWOT/' + section_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': title,
                        'file': fpath,
                        'content': content,
                        'order': 150,
                        'category': 'swot'
                    })
    
    # Week 2 — Yechimlar Tadqiqoti
    week2_dir = os.path.join(REPORT_DIR, 'week2')
    if os.path.exists(week2_dir):
        for root, dirs, files in os.walk(week2_dir):
            for f in sorted(files):
                if f.endswith('.md'):
                    fpath = os.path.join(root, f)
                    if f == '00-INDEX.md':
                        sec_id = 'w2-index'
                        title = 'WEEK 2 INDEX'
                    else:
                        section_name = os.path.basename(os.path.dirname(fpath))
                        file_name = f.replace('.md', '')
                        sec_id = 'w2-' + section_name + '-' + file_name
                        title = 'W2/' + section_name.replace('-', ' ').title() + '/' + file_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': title,
                        'file': fpath,
                        'content': content,
                        'order': 170,
                        'category': 'week2'
                    })
    
    # Week 3 — Real Data
    week3_dir = os.path.join(REPORT_DIR, 'week3')
    if os.path.exists(week3_dir):
        for root, dirs, files in os.walk(week3_dir):
            for f in sorted(files):
                if f.endswith('.md'):
                    fpath = os.path.join(root, f)
                    if f == '00-INDEX.md':
                        sec_id = 'w3-index'
                        title = 'WEEK 3 INDEX'
                    else:
                        section_name = os.path.basename(os.path.dirname(fpath))
                        file_name = f.replace('.md', '')
                        sec_id = 'w3-' + section_name + '-' + file_name
                        title = 'W3/' + section_name.replace('-', ' ').title() + '/' + file_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': title,
                        'file': fpath,
                        'content': content,
                        'order': 180,
                        'category': 'week3'
                    })
    
    # Week 4 — Yechim va Sayqallash
    week4_dir = os.path.join(REPORT_DIR, 'week4')
    if os.path.exists(week4_dir):
        for root, dirs, files in os.walk(week4_dir):
            for f in sorted(files):
                if f.endswith('.md'):
                    fpath = os.path.join(root, f)
                    if f == '00-INDEX.md':
                        sec_id = 'w4-index'
                        title = 'WEEK 4 INDEX'
                    else:
                        section_name = os.path.basename(os.path.dirname(fpath))
                        file_name = f.replace('.md', '')
                        sec_id = 'w4-' + section_name + '-' + file_name
                        title = 'W4/' + section_name.replace('-', ' ').title() + '/' + file_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': title,
                        'file': fpath,
                        'content': content,
                        'order': 190,
                        'category': 'week4'
                    })
    
    # Week 5 — BUILD phase start
    w5_dir = os.path.join(REPORT_DIR, 'week5-build')
    if os.path.exists(w5_dir):
        for root, dirs, files in os.walk(w5_dir):
            for f in sorted(files):
                if f.endswith('.md'):
                    fpath = os.path.join(root, f)
                    file_name = f.replace('.md', '')
                    sec_id = 'w5-' + file_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': 'W5-BUILD/' + file_name.replace('-', ' ').title(),
                        'file': fpath,
                        'content': content,
                        'order': 200,
                        'category': 'week5'
                    })
    
    # Claude tahillari
    claude_dir = os.path.join(REPORT_DIR, 'claude-tahlil')
    if os.path.exists(claude_dir):
        for root, dirs, files in os.walk(claude_dir):
            for f in sorted(files):
                if f.endswith('.md') and f != 'CLAUDE-INDEX.md':
                    fpath = os.path.join(root, f)
                    section_name = os.path.basename(os.path.dirname(fpath))
                    sec_id = 'month1-claude-' + section_name
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        content = fh.read()
                    sections.append({
                        'id': sec_id,
                        'title': 'M1-Claude/' + section_name,
                        'file': fpath,
                        'content': content,
                        'order': 200,
                        'category': 'month1-claude'
                    })
    
    sections.sort(key=lambda s: s['order'])
    return sections


def generate_html():
    sections = get_section_files()
    
    # Build sidebar NAV by category
    week1_links = ''
    swot_links = ''
    week2_links = ''
    week3_links = ''
    week4_links = ''
    claude_links = ''
    week5_links = ''
    for sec in sections:
        sec_id = sanitize_id(sec['id'])
        title_esc = html.escape(sec['title'])
        link_html = '<li><a href="#section-' + sec_id + '" onclick="showSection(\'' + sec_id + '\')">' + title_esc + '</a></li>\n'
        if sec.get('category') == 'week1':
            week1_links += link_html
        elif sec.get('category') == 'swot':
            swot_links += link_html
        elif sec.get('category') == 'week2':
            week2_links += link_html
        elif sec.get('category') == 'week3':
            week3_links += link_html
        elif sec.get('category') == 'week4':
            week4_links += link_html
        elif sec.get('category') == 'claude':
            claude_links += link_html
        elif sec.get('category') == 'week5':
            week5_links += link_html
        elif sec.get('category') == 'month2-w1':
            month2_w1_links += link_html
    
    # Build content HTML sections
    content_sections = ''
    for sec in sections:
        sec_id = sanitize_id(sec['id'])
        html_content = md_to_html(sec['content'])
        file_name = html.escape(os.path.basename(sec['file']))
        
        content_sections += '''
        <div id="section-''' + sec_id + '''" class="section-content" style="display: none;">
            <div class="section-header">
                <span class="file-name">''' + file_name + '''</span>
            </div>
            <div class="section-body">
                ''' + html_content + '''
            </div>
        </div>
        '''
    
    total_files = len(sections)
    week1_count = sum(1 for s in sections if s.get('category') == 'week1')
    swot_count = sum(1 for s in sections if s.get('category') == 'swot')
    week2_count = sum(1 for s in sections if s.get('category') == 'week2')
    week3_count = sum(1 for s in sections if s.get('category') == 'week3')
    week4_count = sum(1 for s in sections if s.get('category') == 'week4')
    claude_count = sum(1 for s in sections if s.get('category') == 'claude')
    week5_count = sum(1 for s in sections if s.get('category') == 'week5')
    
    # Build HTML using string concatenation (NO f-strings - avoids brace issues)
    html_output = '<!DOCTYPE html>\n'
    html_output += '<html lang="uz">\n'
    html_output += '<head>\n'
    html_output += '    <meta charset="UTF-8">\n'
    html_output += '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    html_output += '    <title>DeLiKet - To\'liq Tahlil Hisoboti</title>\n'
    html_output += '<style>\n'
    html_output += '    * { margin: 0; padding: 0; box-sizing: border-box; }\n'
    html_output += '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #e1e4ea; line-height: 1.6; }\n'
    html_output += '    .header { position: fixed; top: 0; left: 0; right: 0; background: #1a1d27; border-bottom: 1px solid #30363d; padding: 12px 24px; display: flex; align-items: center; gap: 16px; z-index: 100; height: 60px; }\n'
    html_output += '    .header h1 { font-size: 20px; color: #58a6ff; flex: 1; }\n'
    html_output += '    .header .stats { font-size: 12px; color: #8b8fa3; }\n'
    html_output += '    .header button { background: #242736; color: #e1e4ea; border: 1px solid #30363d; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }\n'
    html_output += '    .header button:hover { background: #1f2332; }\n'
    html_output += '    #search-box { background: #242736; border: 1px solid #30363d; color: #e1e4ea; padding: 6px 12px; border-radius: 6px; font-size: 13px; width: 200px; }\n'
    html_output += '    #search-box:focus { outline: none; border-color: #58a6ff; }\n'
    html_output += '    .sidebar { position: fixed; top: 60px; left: 0; bottom: 0; width: 280px; background: #1a1d27; border-right: 1px solid #30363d; overflow-y: auto; padding: 12px 0; z-index: 50; }\n'
    html_output += '    .sidebar ul { list-style: none; }\n'
    html_output += '    .sidebar li a { display: block; padding: 8px 16px; color: #8b8fa3; text-decoration: none; font-size: 13px; border-left: 3px solid transparent; cursor: pointer; }\n'
    html_output += '    .sidebar li a:hover { background: #1f2332; color: #e1e4ea; border-left-color: #58a6ff; }\n'
    html_output += '    .nav-category { padding: 12px 16px 4px; font-size: 11px; text-transform: uppercase; color: #8b8fa3; letter-spacing: 1px; }\n'
    html_output += '    .main { margin-left: 280px; margin-top: 60px; padding: 40px; max-width: 900px; }\n'
    html_output += '    .section-content { display: none; }\n'
    html_output += '    .section-content.active { display: block; }\n'
    html_output += '    .section-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #30363d; }\n'
    html_output += '    .file-name { font-size: 13px; color: #8b8fa3; }\n'
    html_output += '    h1 { font-size: 28px; margin: 24px 0 16px; color: #58a6ff; }\n'
    html_output += '    h2 { font-size: 22px; margin: 20px 0 12px; color: #e1e4ea; }\n'
    html_output += '    h3 { font-size: 18px; margin: 16px 0 10px; color: #e1e4ea; }\n'
    html_output += '    h4 { font-size: 15px; margin: 12px 0 8px; color: #8b8fa3; }\n'
    html_output += '    p { margin: 8px 0; }\n'
    html_output += '    a { color: #58a6ff; text-decoration: none; }\n'
    html_output += '    a:hover { text-decoration: underline; }\n'
    html_output += '    table.data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }\n'
    html_output += '    table.data-table th { background: #242736; color: #e1e4ea; padding: 10px 12px; text-align: left; border: 1px solid #30363d; font-weight: 600; }\n'
    html_output += '    table.data-table td { padding: 8px 12px; border: 1px solid #30363d; color: #8b8fa3; }\n'
    html_output += '    table.data-table tr:hover td { background: #1f2332; }\n'
    html_output += '    pre.code-block { background: #242736; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin: 16px 0; overflow-x: auto; font-size: 13px; }\n'
    html_output += '    code { background: #242736; padding: 2px 6px; border-radius: 3px; font-size: 13px; }\n'
    html_output += '    ul, ol { margin: 8px 0; padding-left: 24px; }\n'
    html_output += '    li { margin: 4px 0; color: #8b8fa3; }\n'
    html_output += '    hr { border: none; border-top: 1px solid #30363d; margin: 24px 0; }\n'
    html_output += '    .welcome { text-align: center; padding: 60px 20px; }\n'
    html_output += '    .welcome h1 { font-size: 36px; margin-bottom: 16px; }\n'
    html_output += '    .welcome p { font-size: 16px; color: #8b8fa3; max-width: 600px; margin: 0 auto 8px; }\n'
    html_output += '    .big-number { font-size: 48px; color: #58a6ff; font-weight: bold; margin: 20px 0; }\n'
    html_output += '    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 600px; margin: 24px auto; }\n'
    html_output += '    .stat-card { background: #1a1d27; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }\n'
    html_output += '    .stat-card .number { font-size: 24px; color: #58a6ff; font-weight: bold; }\n'
    html_output += '    .stat-card .label { font-size: 12px; color: #8b8fa3; margin-top: 4px; }\n'
    html_output += '    @media (max-width: 768px) { .sidebar { display: none; } .main { margin-left: 0; padding: 20px; } }\n'
    html_output += '</style>\n'
    html_output += '</head>\n'
    html_output += '<body>\n'
    
    # HEADER
    html_output += '<div class="header">\n'
    html_output += '    <h1>DeLiKet - To\'liq Tahlil Hisoboti</h1>\n'
    html_output += '    <input type="text" id="search-box" placeholder="Qidirish..." onkeyup="searchContent()">\n'
    html_output += '    <span class="stats">' + str(total_files) + ' fayl</span>\n'
    html_output += '</div>\n'
    
    # SIDEBAR
    html_output += '<div class="sidebar">\n'
    html_output += '<ul>\n'
    html_output += '    <li class="nav-category">Asosiy</li>\n'
    html_output += '    <li><a href="#" onclick="showWelcome()">Bosh sahifa</a></li>\n'
    html_output += '    <li><a href="#section-executive-summary" onclick="showSection(\'executive-summary\')">📄 EXECUTIVE SUMMARY</a></li>\n'
    html_output += '    <li><a href="#section-strategy" onclick="showSection(\'strategy\')">STRATEGIYA XARITASI</a></li>\n'
    html_output += '    <li><a href="#section-tahlil-index" onclick="showSection(\'tahlil-index\')">TAHLIL INDEX</a></li>\n'
    html_output += '    <li><a href="#section-claude-index" onclick="showSection(\'claude-index\')">CLAUDE INDEX</a></li>\n'
    html_output += '    <li class="nav-category">📅 Week 1 — Tahlil (' + str(week1_count) + ' fayl)</li>\n'
    html_output += week1_links
    html_output += '    <li class="nav-category">📅 SWOT (' + str(swot_count) + ' fayl)</li>\n'
    html_output += swot_links
    html_output += '    <li class="nav-category">📅 Week 2 — Yechimlar (' + str(week2_count) + ' fayl)</li>\n'
    html_output += week2_links
    html_output += '    <li class="nav-category">📅 Week 3 — Real Data (' + str(week3_count) + ' fayl)</li>\n'
    html_output += week3_links
    html_output += '    <li class="nav-category">📅 Week 4 — Yechim (' + str(week4_count) + ' fayl)</li>\n'
    html_output += week4_links
    html_output += '    <li class="nav-category">📅 Claude (' + str(claude_count) + ' fayl)</li>\n'
    html_output += claude_links
    html_output += '    <li class="nav-category">🚀 Week 5 — BUILD (' + str(week5_count) + ' fayl)</li>\n'
    html_output += week5_links
    html_output += '</ul>\n'
    html_output += '</div>\n'
    
    # MAIN CONTENT
    html_output += '<div class="main" id="main-content">\n'
    
    # WELCOME
    html_output += '<div id="section-welcome" class="welcome">\n'
    html_output += '    <h1>DeLiKet Tahlil Hisoboti</h1>\n'
    html_output += '    <p>Deadstock Liquidation Marketplace - O\'zbekiston bozori uchun to\'liq tahlil</p>\n'
    html_output += '    <div class="big-number">10,155+</div>\n'
    html_output += '    <p>real ma\'lumot nuqtalari</p>\n'
    html_output += '    <div class="stats-grid">\n'
    html_output += '        <div class="stat-card"><div class="number">' + str(week1_count) + '</div><div class="label">Week 1 — Tahlil</div></div>\n'
    html_output += '        <div class="stat-card"><div class="number">' + str(week5_count) + '</div><div class="label">Week 5 — BUILD</div></div>\n'
    html_output += '        <div class="stat-card"><div class="number">' + str(total_files) + '</div><div class="label">Jami fayllar</div></div>\n'
    html_output += '    </div>\n'
    html_output += '</div>\n'
    
    # ALL SECTIONS
    html_output += content_sections
    
    html_output += '</div>\n'
    
    # JAVASCRIPT
    html_output += '<script>\n'
    html_output += 'let currentSection = "welcome";\n'
    html_output += 'function showSection(sectionId) {\n'
    html_output += '    document.querySelectorAll(".section-content").forEach(function(el) { el.style.display = "none"; });\n'
    html_output += '    document.getElementById("section-welcome").style.display = "none";\n'
    html_output += '    var target = document.getElementById("section-" + sectionId);\n'
    html_output += '    if (target) { target.style.display = "block"; target.classList.add("active"); currentSection = sectionId; }\n'
    html_output += '    if (window.innerWidth <= 768) { document.querySelector(".sidebar").style.display = "none"; }\n'
    html_output += '}\n'
    html_output += 'function showWelcome() {\n'
    html_output += '    document.querySelectorAll(".section-content").forEach(function(el) { el.style.display = "none"; });\n'
    html_output += '    document.getElementById("section-welcome").style.display = "block";\n'
    html_output += '    currentSection = "welcome";\n'
    html_output += '}\n'
    html_output += 'function searchContent() {\n'
    html_output += '    var query = document.getElementById("search-box").value.toLowerCase();\n'
    html_output += '    if (query.length < 2) { showWelcome(); return; }\n'
    html_output += '    document.querySelectorAll(".section-body").forEach(function(body) {\n'
    html_output += '        var text = body.textContent.toLowerCase();\n'
    html_output += '        if (text.includes(query)) { body.parentElement.style.display = "block"; }\n'
    html_output += '        else { body.parentElement.style.display = "none"; }\n'
    html_output += '    });\n'
    html_output += '}\n'
    html_output += 'document.addEventListener("keydown", function(e) {\n'
    html_output += '    if (e.key === "Escape") showWelcome();\n'
    html_output += '});\n'
    html_output += 'showWelcome();\n'
    html_output += '</script>\n'
    
    html_output += '</body>\n'
    html_output += '</html>\n'
    
    # Write output
    output_path = os.path.join(REPORT_DIR, 'Deliket_Hisoboti.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_output)
    
    print(f"OK Hisobot yaratildi: {output_path}")
    print(f"Fayllar: {total_files} ta (W1: {week1_count}, W2: {week2_count}, W3: {week3_count}, W4: {week4_count}, SWOT: {swot_count}, Claude: {claude_count}, W5-BUILD: {week5_count})")


if __name__ == '__main__':
    generate_html()

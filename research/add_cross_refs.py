#!/usr/bin/env python3
"""Kross-havolalar qo'shish skripti — 46 ta tahlil fayliga bog'liq tahlillarni qo'shadi"""

import os
import re

TAHLIL_DIR = "DeLiKet/week1/tahlil"

# Har bir bo'lim uchun bog'liq tahlillar (relativ yo'llar)
CROSS_REFS = {
    "1-elektronika": {
        "title": "📱 ELEKTRONIKA",
        "links": [
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("🛒 Uzum/Asaxiy mijoz sharhlari", "../11-uzum-asaxiy/01-umumiy-tahlil.md"),
            ("🌍 Global brendlar case study", "../12-global-case/01-umumiy-tahlil.md"),
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
        ]
    },
    "2-kiyim-kechak": {
        "title": "👕 KIYIM-KECHAK",
        "links": [
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("📸 Instagram/Facebook commentlar", "../8-instagram-facebook/01-umumiy-tahlil.md"),
            ("🌍 Global fashion case study", "../12-global-case/01-umumiy-tahlil.md"),
            ("🏭 Kichik ishlab chiqarish", "../14-ishlab-chiqarish/01-umumiy-tahlil.md"),
        ]
    },
    "3-oziq-ovqat": {
        "title": "🍞 OZIQ-OVQAT",
        "links": [
            ("🌾 Qishloq xojaligi", "../19-qishloq-xojaligi/01-umumiy-tahlil.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
            ("📊 Umumiy bozor kuzatuvlari", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
        ]
    },
    "4-qurilish": {
        "title": "🏗️ QURILISH",
        "links": [
            ("🛋️ Mebel tahlili", "../5-mebel/01-umumiy-tahlil.md"),
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
            ("🏭 Kichik ishlab chiqarish", "../14-ishlab-chiqarish/01-umumiy-tahlil.md"),
        ]
    },
    "5-mebel": {
        "title": "🛋️ MEBEL",
        "links": [
            ("🏗️ Qurilish materiallari", "../4-qurilish/01-umumiy-tahlil.md"),
            ("🏭 Kichik ishlab chiqarish", "../14-ishlab-chiqarish/01-umumiy-tahlil.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("🛒 Uzum/Asaxiy sharhlari", "../11-uzum-asaxiy/01-umumiy-tahlil.md"),
        ]
    },
    "6-uy-rozgor": {
        "title": "🏠 UY-RO'ZG'OR",
        "links": [
            ("📱 Elektronika aksessuarlari", "../1-elektronika/03-audio-aksessuarlar.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("🛒 Uzum/Asaxiy sharhlari", "../11-uzum-asaxiy/01-umumiy-tahlil.md"),
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
        ]
    },
    "7-telegram-olx": {
        "title": "📨 TELEGRAM VA OLX",
        "links": [
            ("📱 Elektronika", "../1-elektronika/05-umumiy-tahlil.md"),
            ("👕 Kiyim-kechak", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("🍞 Oziq-ovqat", "../3-oziq-ovqat/04-umumiy-tahlil.md"),
            ("🛒 Uzum/Asaxiy platformalari", "../11-uzum-asaxiy/01-umumiy-tahlil.md"),
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
        ]
    },
    "8-instagram-facebook": {
        "title": "📸 INSTAGRAM/FACEBOOK",
        "links": [
            ("🎯 Tadbirkor intervyulari", "../9-tadbirkor-intervyu/01-umumiy-tahlil.md"),
            ("🎬 YouTube commentlar", "../15-youtube/01-umumiy-tahlil.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
        ]
    },
    "9-tadbirkor-intervyu": {
        "title": "🎯 TADBIRKOR INTERVYULARI",
        "links": [
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
            ("🇷🇺 Rus forumlari", "../10-rus-forumlari/01-umumiy-tahlil.md"),
        ]
    },
    "10-rus-forumlari": {
        "title": "🇷🇺 RUS FORUMLARI",
        "links": [
            ("🎯 Tadbirkor intervyulari", "../9-tadbirkor-intervyu/01-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
        ]
    },
    "11-uzum-asaxiy": {
        "title": "🛒 UZUM, ASAXIY, TEXNOMART",
        "links": [
            ("📱 Elektronika", "../1-elektronika/05-umumiy-tahlil.md"),
            ("👕 Kiyim-kechak", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
        ]
    },
    "12-global-case": {
        "title": "🌍 GLOBAL CASE STUDY",
        "links": [
            ("📱 Elektronika — mahalliy", "../1-elektronika/05-umumiy-tahlil.md"),
            ("👕 Kiyim-kechak — mahalliy", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
            ("🌍 Global 2023-2026", "../22-global-2026/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
        ]
    },
    "13-import-logistika": {
        "title": "📦 IMPORT VA LOGISTIKA",
        "links": [
            ("📱 Elektronika importi", "../1-elektronika/01-smartfonlar.md"),
            ("🍞 Oziq-ovqat importi", "../3-oziq-ovqat/04-umumiy-tahlil.md"),
            ("🏗️ Qurilish importi", "../4-qurilish/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar logistikasi", "../21-viloyatlar/02-logistika.md"),
            ("🚗 Avtomobil transport", "../18-avtomobil/01-umumiy-tahlil.md"),
        ]
    },
    "14-ishlab-chiqarish": {
        "title": "🏭 KICHIK ISHLAB CHIQARISH",
        "links": [
            ("👕 Kiyim-kechak ishlab chiqarish", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("🛋️ Mebel ishlab chiqarish", "../5-mebel/01-umumiy-tahlil.md"),
            ("🌾 Qishloq xojaligi", "../19-qishloq-xojaligi/01-umumiy-tahlil.md"),
            ("📨 Telegram/OLX", "../7-telegram-olx/01-telegram-postlari.md"),
        ]
    },
    "15-youtube": {
        "title": "🎬 YOUTUBE",
        "links": [
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
            ("🎯 Tadbirkor intervyulari", "../9-tadbirkor-intervyu/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
        ]
    },
    "16-google-maps": {
        "title": "🗺️ GOOGLE MAPS",
        "links": [
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
            ("🛒 Uzum/Asaxiy sharhlari", "../11-uzum-asaxiy/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
        ]
    },
    "17-umumiy-kuzatuvlar": {
        "title": "📊 UMUMIY KUZATUVLAR",
        "links": [
            ("📱 Elektronika", "../1-elektronika/05-umumiy-tahlil.md"),
            ("👕 Kiyim-kechak", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("🌍 Global case study", "../12-global-case/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
            ("🌍 Global 2023-2026", "../22-global-2026/01-umumiy-tahlil.md"),
        ]
    },
    "18-avtomobil": {
        "title": "🚗 AVTOMOBIL",
        "links": [
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
            ("📨 Telegram/OLX elonlari", "../7-telegram-olx/01-telegram-postlari.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
        ]
    },
    "19-qishloq-xojaligi": {
        "title": "🌾 QISHLOQ XO'JALIGI",
        "links": [
            ("🍞 Oziq-ovqat sektori", "../3-oziq-ovqat/04-umumiy-tahlil.md"),
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
        ]
    },
    "20-xizmat": {
        "title": "💇 XIZMAT KO'RSATISH",
        "links": [
            ("🗺️ Viloyatlar boyicha", "../21-viloyatlar/01-umumiy-tahlil.md"),
            ("📸 Instagram/Facebook", "../8-instagram-facebook/01-umumiy-tahlil.md"),
            ("🎯 Tadbirkor intervyulari", "../9-tadbirkor-intervyu/01-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
        ]
    },
    "21-viloyatlar": {
        "title": "🗺️ VILOYATLAR",
        "links": [
            ("📦 Import va logistika", "../13-import-logistika/01-umumiy-tahlil.md"),
            ("🌾 Qishloq xojaligi", "../19-qishloq-xojaligi/01-umumiy-tahlil.md"),
            ("💇 Xizmat korsatish", "../20-xizmat/01-umumiy-tahlil.md"),
            ("🚗 Avtomobil transport", "../18-avtomobil/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
        ]
    },
    "22-global-2026": {
        "title": "🌍 GLOBAL 2023-2026",
        "links": [
            ("🌍 Global case study", "../12-global-case/01-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
            ("🤖 Global texnologiyalar", "../22-global-2026/02-texnologiyalar.md"),
        ]
    },
    "23-bozor-kuzatuvlari": {
        "title": "📊 BOZOR KUZATUVLARI",
        "links": [
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
            ("🎯 Tadbirkor intervyulari", "../9-tadbirkor-intervyu/01-umumiy-tahlil.md"),
            ("📝 Yakuniy tahlil", "../24-toldirish/01-umumiy-tahlil.md"),
            ("🌍 Global 2023-2026", "../22-global-2026/01-umumiy-tahlil.md"),
        ]
    },
    "24-toldirish": {
        "title": "📝 YAKUNIY TAHLIL",
        "links": [
            ("📱 Elektronika", "../1-elektronika/05-umumiy-tahlil.md"),
            ("👕 Kiyim-kechak", "../2-kiyim-kechak/06-umumiy-tahlil.md"),
            ("🌍 Global case study", "../12-global-case/01-umumiy-tahlil.md"),
            ("📊 Bozor kuzatuvlari", "../23-bozor-kuzatuvlari/01-umumiy-tahlil.md"),
            ("📊 Umumiy kuzatuvlar", "../17-umumiy-kuzatuvlar/01-umumiy-tahlil.md"),
        ]
    },
}

def get_all_md_files(base_dir):
    """Barcha .md fayllarni topish (TAHLIL-INDEX dan tashqari)"""
    files = []
    for root, dirs, fnames in os.walk(base_dir):
        for f in fnames:
            if f.endswith(".md") and f != "TAHLIL-INDEX.md":
                files.append(os.path.join(root, f))
    return files

def get_section_name(filepath):
    """Fayl joylashgan bo'lim nomini aniqlash"""
    rel = os.path.relpath(filepath, TAHLIL_DIR)
    parts = rel.split(os.sep)
    if len(parts) >= 2:
        return parts[0]  # bo'lim nomi (masalan: 1-elektronika)
    return None

def add_cross_refs_to_file(filepath):
    """Faylga BOG'LIQ TAHLILLAR bo'limini qo'shish"""
    section = get_section_name(filepath)
    if section not in CROSS_REFS:
        print(f"  ⚠️  Unknown section: {section}")
        return False

    ref_data = CROSS_REFS[section]
    
    # Faylni o'qish
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Agar allaqachon BOG'LIQ TAHLILLAR bo'limi bo'lsa, o'tkazib yuborish
    if "## BOG'LIQ TAHLILLAR" in content:
        print(f"  ⏭️  Already has cross-refs: {os.path.basename(filepath)}")
        return False
    
    # BOG'LIQ TAHLILLAR bo'limini yaratish
    cross_ref_section = f"\n\n---\n\n## 🔗 BOG'LIQ TAHLILLAR\n\n{ref_data['title']} bo'limi bilan bog'liq tahlillar:\n\n"
    for label, link_path in ref_data["links"]:
        # link_path ni fayl joylashgan papkaga nisbatan to'g'rilash
        linked_section = link_path.split("/")[1]  # masalan: "7-telegram-olx"
        # Fayl nomini chiroyli qilish
        fname = os.path.basename(link_path).replace(".md", "").replace("-", " ").title()
        cross_ref_section += f"| [{label}]({link_path}) | → {fname} |\n"
    
    cross_ref_section += f"\n*📎 Bu tahlil {ref_data['title']} bo'limining bir qismidir*\n"
    
    # Faylga yozish
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(cross_ref_section)
    
    print(f"  ✅ {os.path.basename(filepath)} — {len(ref_data['links'])} ta havola qo'shildi")
    return True

def main():
    print("=" * 60)
    print("🔗 KROSS-HAVOLALAR QO'SHISH SKRIPTI")
    print("=" * 60)
    
    files = get_all_md_files(TAHLIL_DIR)
    print(f"\nJami fayllar: {len(files)}")
    
    updated = 0
    skipped = 0
    for f in sorted(files):
        if add_cross_refs_to_file(f):
            updated += 1
        else:
            skipped += 1
    
    print(f"\n✅ Yangilangan: {updated} ta fayl")
    print(f"⏭️  O'tkazib yuborilgan (allaqachon bor): {skipped} ta")
    print("=" * 60)

if __name__ == "__main__":
    main()

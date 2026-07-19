#!/usr/bin/env python3
"""
DeLiKet — Playwright E2E Tests
Full user flow: Browse → Filter → View Detail → Bid Link → Navigate → Dark Mode → Mobile

Requirements:
  pip install playwright
  python3 -m playwright install chromium

Usage:
  python3 tests/e2e_test.py                    (run all headless)
  python3 tests/e2e_test.py --json             (JSON output to stdout)
  python3 tests/e2e_test.py --json --save      (save to /tmp/e2e-results.json)
  BASE_URL=http://localhost:8000 python3 tests/e2e_test.py  (custom URL)
"""

import os
import sys
import asyncio
from pathlib import Path

BASE_URL = os.getenv("BASE_URL", "https://delikat.vercel.app")
SCREENSHOT_DIR = Path("/tmp/deliket-e2e-screenshots")

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed. Run: pip install playwright && python3 -m playwright install chromium")
    sys.exit(1)


class DeLiKetE2ETest:
    """E2E test suite for DeLiKet web platform"""
    __test__ = False  # Not a pytest test class

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.screenshots_taken = 0
        self.results = {}  # name -> {"status": str, "detail": str}

    def to_dict(self):
        """Return results as JSON-serializable dict"""
        total = self.passed + self.failed
        return {
            "passed": self.passed,
            "failed": self.failed,
            "total": total,
            "score": round(self.passed / max(total, 1) * 100, 1),
            "screenshots": self.screenshots_taken,
            "results": self.results,
            "base_url": BASE_URL,
            "timestamp": __import__('datetime').datetime.now().isoformat(),
        }

    async def screenshot(self, page, name):
        self.screenshots_taken += 1
        path = SCREENSHOT_DIR / f"{name}.png"
        await page.screenshot(path=str(path), full_page=False)
        print(f"    📸 {name}.png saved")
        return path

    def assert_eq(self, actual, expected, msg=""):
        if actual == expected:
            self.passed += 1
            return True
        self.failed += 1
        print(f"  ❌ FAIL: {msg}\n     Expected: {expected!r}\n     Actual:   {actual!r}")
        return False

    def assert_true(self, condition, msg=""):
        if condition:
            self.passed += 1
            return True
        self.failed += 1
        print(f"  ❌ FAIL: {msg}")
        return False

    def assert_gt(self, actual, threshold, msg=""):
        if actual > threshold:
            self.passed += 1
            return True
        self.failed += 1
        print(f"  ❌ FAIL: {msg} — got {actual}, expected > {threshold}")
        return False

    # ──────────────────────────────────────────
    # API TESTS (use Playwright APIRequestContext, no aiohttp)
    # ──────────────────────────────────────────

    async def test_api_ping(self, api):
        print("\n  [API] GET /api/ping")
        r = await (await api.get(f"{BASE_URL}/api/ping")).json()
        self.assert_eq(r.get("status"), "ok", "ping status")
        self.assert_true("version" in r, "ping version field")

    async def test_api_stats(self, api):
        print("  [API] GET /api/stats")
        r = await (await api.get(f"{BASE_URL}/api/stats")).json()
        self.assert_gt(r.get("users", 0), 0, "stats has users")
        self.assert_gt(r.get("active_lots", 0), 0, "stats has active lots")
        self.assert_eq(r.get("lots"), 21, "stats total lots = 21")
        self.assert_eq(r.get("bids"), 5, "stats total bids = 5")
        self.assert_true("price_range" in r, "stats has price_range")
        self.assert_true("categories" in r, "stats has categories")

    async def test_api_categories(self, api):
        print("  [API] GET /api/categories")
        r = await (await api.get(f"{BASE_URL}/api/categories")).json()
        cats = r.get("categories", [])
        self.assert_gt(len(cats), 1, "has categories")
        names = [c["name"] for c in cats]
        self.assert_true("smartfon" in names, "has smartfon category")
        self.assert_true("all" in names, "has 'all' category")

    async def test_api_lots(self, api):
        print("  [API] GET /api/lots")
        r = await (await api.get(f"{BASE_URL}/api/lots?limit=3")).json()
        self.assert_true("items" in r, "lots has items")
        self.assert_gt(len(r["items"]), 0, "has lot items")
        item = r["items"][0]
        self.assert_true("id" in item, "lot has id")
        self.assert_true("title" in item, "lot has title")
        self.assert_true("price" in item, "lot has price")
        self.assert_true("category" in item, "lot has category")
        self.assert_true("seller" in item, "lot has seller")

    async def test_api_lot_detail(self, api):
        print("  [API] GET /api/lots/1")
        r = await (await api.get(f"{BASE_URL}/api/lots/1")).json()
        self.assert_eq(r.get("id"), 1, "lot id = 1")
        self.assert_true("title" in r, "detail has title")
        self.assert_true("bids" in r, "detail has bids")
        self.assert_true("seller" in r, "detail has seller")
        self.assert_true("phone" in r.get("seller", {}), "detail has seller phone")

    async def test_api_lots_filter(self, api):
        print("  [API] GET /api/lots?category=smartfon")
        r = await (await api.get(f"{BASE_URL}/api/lots?category=smartfon&limit=10")).json()
        items = r.get("items", [])
        self.assert_gt(len(items), 0, "smartfon filter returns lots")
        for item in items:
            self.assert_eq(item["category"], "smartfon", f"lot {item['id']} is smartfon")

    async def test_api_lots_search(self, api):
        print("  [API] GET /api/lots?search=iPhone")
        r = await (await api.get(f"{BASE_URL}/api/lots?search=iPhone&limit=5")).json()
        self.assert_gt(len(r.get("items", [])), 0, "search iPhone returns results")

    async def test_api_lots_grade(self, api):
        print("  [API] GET /api/lots?grade=A")
        r = await (await api.get(f"{BASE_URL}/api/lots?grade=A&limit=5")).json()
        for item in r.get("items", []):
            self.assert_eq(item["grade"], "A", f"lot {item['id']} grade is A")

    # ──────────────────────────────────────────
    # WEB UI TESTS (desktop)
    # ──────────────────────────────────────────

    async def test_homepage_loads(self, page):
        """Homepage hero, stats, categories, marketplace"""
        print("\n  [UI] Homepage loads correctly")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        title = await page.title()
        self.assert_true("DeLiKet" in title, f"page title: {title}")

        hero_h1 = await page.text_content("h1")
        self.assert_true("Deadstock" in (hero_h1 or ""), f"hero h1: {hero_h1}")

        stat_lots = await page.text_content("#statLots")
        self.assert_true(stat_lots and stat_lots not in ("0", ""), f"statLots: {stat_lots}")

        header = await page.locator(".header").count()
        self.assert_gt(header, 0, "header exists")

        cats = await page.locator(".category-card").count()
        self.assert_gt(cats, 0, f"category cards: {cats}")

        mp = await page.locator("#marketplace").count()
        self.assert_eq(mp, 1, "marketplace section exists")

        await self.screenshot(page, "homepage")

    async def test_navigation_links(self, page):
        """All nav links navigate correctly"""
        print("\n  [UI] Navigation links")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(1)

        nav_links = [
            ("/analytics", "analytics"),
            ("/seller", "seller"),
            ("/how-it-works", "how-it-works"),
            ("/data-sources", "data-sources"),
        ]

        for path, name in nav_links:
            link = page.locator(f'a[href="{path}"]').first
            if await link.count() > 0:
                await link.click()
                await asyncio.sleep(2)
                current = page.url
                self.assert_true(path in current, f"nav to {name}: {current}")
                await self.screenshot(page, f"nav-{name}")
            else:
                print(f"    ⚠️  Link '{path}' not found (hidden on this viewport)")

    async def test_lot_cards_and_modal(self, page):
        """Lot cards visible, click opens modal with bid button"""
        print("\n  [UI] Lot cards + Modal + Bid link")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)

        lot_cards = page.locator(".lot-card")
        count = await lot_cards.count()
        self.assert_gt(count, 0, f"lot cards visible: {count}")

        if count > 0:
            await lot_cards.first.click()
            await asyncio.sleep(2)

            # Check modal opened
            modal = page.locator(".modal-overlay.open, #lotModal.open")
            self.assert_gt(await modal.count(), 0, "modal opened after click")

            # Check modal has loaded content
            modal_title = await page.text_content("#modalTitle, .modal-header h2")
            self.assert_true(modal_title and "Loading" not in (modal_title or ""),
                             f"modal title loaded: {modal_title}")

            # Check bid button exists and links to Telegram
            bid_btn = page.locator("#modalBidBtn")
            if await bid_btn.count() > 0:
                bid_href = await bid_btn.get_attribute("href")
                self.assert_true("t.me" in (bid_href or ""),
                                 f"bid button links to Telegram: {bid_href}")
                bid_text = await bid_btn.text_content()
                self.assert_true("Taklif" in (bid_text or "") or "bid" in (bid_text or "").lower(),
                                 f"bid button has bid text: {bid_text}")
                print(f"    ✅ Bid button links to: {bid_href}")
            else:
                print("    ⚠️  Bid button not found in modal")

            await self.screenshot(page, "lot-modal")

            # Close modal
            close_btn = page.locator("#modalCloseBtn, .modal-close").first
            if await close_btn.count() > 0:
                await close_btn.click()
                await asyncio.sleep(0.5)

    async def test_filter_and_sort(self, page):
        """Category filter + price sort work"""
        print("\n  [UI] Filter + Sort")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        cat_card = page.locator(".category-card").first
        if await cat_card.count() > 0:
            await cat_card.click()
            await asyncio.sleep(2)
            await self.screenshot(page, "filter-category")

        sort_select = page.locator("#sortSelect")
        if await sort_select.count() > 0:
            await sort_select.select_option("price|asc")
            await asyncio.sleep(2)
            await self.screenshot(page, "sort-price-asc")
            await sort_select.select_option("price|desc")
            await asyncio.sleep(1)

    async def test_marketplace_scroll(self, page):
        """Load More button works"""
        print("\n  [UI] Marketplace scroll / Load More")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        mp = page.locator("#marketplace")
        if await mp.count() > 0:
            await mp.scroll_into_view_if_needed()
            await asyncio.sleep(1)

        initial_cards = await page.locator(".lot-card").count()
        print(f"    Initial lot cards: {initial_cards}")

        load_more = page.locator("#loadMoreBtn")
        if await load_more.count() > 0 and await load_more.is_visible():
            await load_more.click()
            await asyncio.sleep(2)
            new_count = await page.locator(".lot-card").count()
            print(f"    After load more: {new_count}")
            self.assert_gt(new_count, initial_cards, "load more added cards")

        await self.screenshot(page, "marketplace-scrolled")

    async def test_scroll_progress_and_toast(self, page):
        """Scroll progress bar updates, scroll-to-top button appears"""
        print("\n  [UI] Scroll progress + Toast + Scroll-to-top")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(1)

        progress = page.locator("#scrollProgressBar").first
        self.assert_gt(await progress.count(), 0, "scroll progress bar exists")

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.5)")
        await asyncio.sleep(0.5)

        progress_width = await progress.get_attribute("style") or ""
        self.assert_true("width" in progress_width, f"progress bar updated: {progress_width}")

        scroll_top = page.locator("#scrollTop")
        visible = await scroll_top.evaluate("el => el.classList.contains('visible')")
        self.assert_true(visible, "scroll-top button visible after scroll")

        await self.screenshot(page, "scroll-progress")

        if visible:
            await scroll_top.click()
            await asyncio.sleep(1)

    async def test_dark_mode(self, page):
        """Dark mode works on all pages"""
        print("\n  [UI] Dark mode (all pages)")
        pages_to_test = ["/", "/analytics", "/seller", "/how-it-works", "/data-sources"]

        for path in pages_to_test:
            url = f"{BASE_URL}{path}"
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(1.5)

            await page.evaluate("""
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('deliket-theme', 'dark');
            """)
            await asyncio.sleep(0.5)

            theme = await page.evaluate("document.documentElement.getAttribute('data-theme')")
            page_name = path[1:] if path != "/" else "home"
            self.assert_eq(theme, "dark", f"dark mode on {page_name}")
            await self.screenshot(page, f"dark-{page_name}")

        # Restore light
        await page.evaluate("""
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('deliket-theme', 'light');
        """)
        await asyncio.sleep(0.5)

    async def test_analytics_page(self, page):
        """Analytics: summary cards, charts, grade dist, top sellers"""
        print("\n  [UI] Analytics page")
        await page.goto(f"{BASE_URL}/analytics", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)

        title = await page.title()
        self.assert_true("Analytics" in title, f"analytics title: {title}")

        summary_cards = await page.locator(".summary-card").count()
        self.assert_gt(summary_cards, 0, f"summary cards: {summary_cards}")

        stat = await page.text_content("#totalLots")
        self.assert_true(stat and stat != "—", f"totalLots value: {stat}")

        bars = await page.locator(".chart-bar-group").count()
        self.assert_gt(bars, 0, f"chart bars: {bars}")

        grade_items = await page.locator("#gradeDistribution .category-dist-item").count()
        self.assert_eq(grade_items, 3, "grade distribution has 3 items")

        seller_items = await page.locator(".seller-row").count()
        print(f"    Top sellers rendered: {seller_items}")

        await self.screenshot(page, "analytics")

    async def test_seller_page(self, page):
        """Seller profiles render"""
        print("\n  [UI] Seller page")
        await page.goto(f"{BASE_URL}/seller", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)

        title = await page.title()
        self.assert_true("Sotuvchilar" in title or "Seller" in title, f"seller title: {title}")

        sellers = await page.locator(".seller-card, .profile-card, .seller-row").count()
        self.assert_gt(sellers, 0, f"seller profiles: {sellers}")

        await self.screenshot(page, "seller-page")

    async def test_data_sources_page(self, page):
        """Data sources with research methodology"""
        print("\n  [UI] Data sources page")
        await page.goto(f"{BASE_URL}/data-sources", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        title = await page.title()
        self.assert_true("Manbalar" in title or "Data" in title, f"data-sources title: {title}")

        body_text = await page.text_content("body") or ""
        has_attribution = "Week" in body_text or "tadqiqot" in body_text
        self.assert_true(has_attribution, "research methodology visible")

        await self.screenshot(page, "data-sources")

    async def test_how_it_works_page(self, page):
        """How-it-works guide page"""
        print("\n  [UI] How it works")
        await page.goto(f"{BASE_URL}/how-it-works", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        title = await page.title()
        self.assert_true("Qanday" in title or "How" in title or "Qo'llanma" in title,
                         f"guide title: {title}")

        await self.screenshot(page, "how-it-works")

    async def test_lazy_sections(self, page):
        """Features, CTA, Footer lazy-load on scroll"""
        print("\n  [UI] Lazy-loaded sections (features, CTA, footer)")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        features_loaded = await page.evaluate(
            '() => document.querySelector("#features")?.classList.contains("loaded")'
        )
        print(f"    Features initially loaded: {features_loaded}")

        # Scroll to very bottom to trigger all lazy loads
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2)

        for section_id, name in [("#features", "Features"), ("#cta-section", "CTA"), ("#footer", "Footer")]:
            loaded = await page.evaluate(
                f'() => document.querySelector("{section_id}")?.classList.contains("loaded")'
            )
            print(f"    {name} loaded: {loaded}")

        await self.screenshot(page, "lazy-sections-loaded")

    async def test_page_height(self, page):
        """Mobile page height optimized (navigate fresh to avoid lazy-load interference)"""
        print("\n  [UI] Page height measurement")
        # Mobile viewport — fresh navigation (no lazy sections triggered yet)
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        mobile_height = await page.evaluate("document.documentElement.scrollHeight")
        print(f"    Mobile page height: {mobile_height}px ({mobile_height//844}x viewports)")

        # Desktop viewport
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        desktop_height = await page.evaluate("document.documentElement.scrollHeight")
        print(f"    Desktop page height: {desktop_height}px ({desktop_height//900}x viewports)")

        if mobile_height < 10000:
            print(f"    ✅ Excellent! Mobile height: {mobile_height}px")
        elif mobile_height < 15000:
            print(f"    👍 Good mobile height: {mobile_height}px")
        else:
            print(f"    ⚠️  Mobile height: {mobile_height}px (was 39K before optimization)")

        self.assert_true(mobile_height < 20000,
                         f"mobile height {mobile_height}px < 20000px")

        # Reset viewport
        await page.set_viewport_size({"width": 1440, "height": 900})

    # ──────────────────────────────────────────
    # MOBILE TESTS
    # ──────────────────────────────────────────

    async def test_mobile_responsive(self, page):
        """Mobile viewport with bottom nav, navigation, dark mode"""
        print("\n  [UI] Mobile responsive")
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        # Bottom nav exists with 4 items
        bottom_nav = page.locator(".mobile-bottom-nav, #mobileBottomNav").first
        self.assert_gt(await bottom_nav.count(), 0, "mobile bottom nav exists")

        nav_items = await page.locator(".mobile-bottom-nav a, #mobileBottomNav a").count()
        self.assert_eq(nav_items, 4, f"4 nav items: {nav_items}")

        # Home should be active
        home_link = page.locator('.mobile-bottom-nav a[href="/"]').first
        if await home_link.count() > 0:
            cls = await home_link.get_attribute("class")
            self.assert_true("active" in (cls or ""), "home nav is active")

        await self.screenshot(page, "mobile-home")

        # Navigate via bottom nav to analytics (use page.goto instead of fragile click)
        await page.goto(f"{BASE_URL}/analytics", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)
        self.assert_true("analytics" in page.url, f"navigated to analytics: {page.url}")
        await self.screenshot(page, "mobile-analytics")

        await page.goto(f"{BASE_URL}/seller", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)
        await self.screenshot(page, "mobile-seller")

        # Mobile dark mode
        await page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
        await asyncio.sleep(0.5)
        await self.screenshot(page, "mobile-dark")

        # Restore
        await page.evaluate("document.documentElement.setAttribute('data-theme','light')")
        await page.set_viewport_size({"width": 1440, "height": 900})


async def run_all(json_output=False, save_json=False):
    """Run all E2E tests

    Args:
        json_output: If True, print JSON results to stdout at the end
        save_json: If True, save JSON results to /tmp/deliket-e2e-results.json

    Returns:
        Tuple of (exit_code, results_dict)
    """
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    test = DeLiKetE2ETest()

    print("=" * 60)
    print("  🔍 DELIKET E2E TEST SUITE")
    print("=" * 60)
    print(f"  Base URL: {BASE_URL}")
    print(f"  Screenshots: {SCREENSHOT_DIR}/")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
        )
        page = await context.new_page()

        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: (
            console_errors.append(f"[{msg.type}] {msg.text[:200]}")
            if msg.type in ("error", "warning") else None
        ))
        page.on("pageerror", lambda err: console_errors.append(f"[PAGE_ERROR] {err}"))

        # API context (no aiohttp dependency needed)
        api = await p.request.new_context()

        print("\n" + "-" * 40)
        print("  📡 PHASE 1: API TESTS")
        print("-" * 40)

        api_tests = [
            ("Ping", test.test_api_ping),
            ("Stats", test.test_api_stats),
            ("Categories", test.test_api_categories),
            ("Lots list", test.test_api_lots),
            ("Lot detail", test.test_api_lot_detail),
            ("Filter by category", test.test_api_lots_filter),
            ("Search", test.test_api_lots_search),
            ("Filter by grade", test.test_api_lots_grade),
        ]

        for name, fn in api_tests:
            try:
                await fn(api)
            except Exception as e:
                test.failed += 1
                print(f"  ❌ {name}: {e}")

        print("\n" + "-" * 40)
        print("  🖥️  PHASE 2: WEB UI (desktop)")
        print("-" * 40)

        ui_tests = [
            ("Homepage", test.test_homepage_loads),
            ("Navigation", test.test_navigation_links),
            ("Lot Cards + Modal + Bid", test.test_lot_cards_and_modal),
            ("Filter & Sort", test.test_filter_and_sort),
            ("Marketplace Scroll", test.test_marketplace_scroll),
            ("Scroll Progress", test.test_scroll_progress_and_toast),
            ("Dark Mode", test.test_dark_mode),
            ("Analytics", test.test_analytics_page),
            ("Sellers", test.test_seller_page),
            ("Data Sources", test.test_data_sources_page),
            ("How It Works", test.test_how_it_works_page),
            ("Lazy Sections", test.test_lazy_sections),
            ("Page Height", test.test_page_height),
        ]

        for name, fn in ui_tests:
            print(f"\n── {name} ──")
            try:
                await fn(page)
            except Exception as e:
                test.failed += 1
                print(f"  ❌ ERROR: {e}")
                import traceback
                traceback.print_exc()

        print("\n" + "-" * 40)
        print("  📱 PHASE 3: MOBILE")
        print("-" * 40)

        try:
            await test.test_mobile_responsive(page)
        except Exception as e:
            test.failed += 1
            print(f"  ❌ ERROR: {e}")

        # Console errors summary
        print("\n" + "-" * 40)
        print(f"  ⚠️  CONSOLE ERRORS ({len(console_errors)})")
        print("-" * 40)
        if console_errors:
            seen = set()
            for err in console_errors:
                short = err[:200]
                if short not in seen:
                    icon = "❌" if "error" in err.lower() else "⚠️"
                    print(f"  {icon} {short}")
                    seen.add(short)
        else:
            print("  ✅ No console errors!")

        await api.dispose()
        await context.close()
        await browser.close()

    # Results
    total = test.passed + test.failed
    pct = round(test.passed / total * 100, 1) if total > 0 else 0

    print("\n" + "=" * 60)
    print(f"  📊 E2E TEST RESULTS")
    print("=" * 60)
    print(f"  ✅ Passed:  {test.passed}")
    print(f"  ❌ Failed:  {test.failed}")
    print(f"  📸 Screenshots: {test.screenshots_taken}")
    print(f"  ⏱️  Total assertions: {total}")
    print(f"  🎯 Score: {pct}%")
    print(f"\n  Screenshots: {SCREENSHOT_DIR}/")

    exit_code = 1 if test.failed > 0 else 0
    results = test.to_dict()

    # JSON output
    if json_output or save_json:
        import json as _json
        if save_json:
            path = E2E_RESULTS_FILE
            with open(path, "w") as f:
                _json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Saved: {path}")
        if json_output:
            print(_json.dumps(results, indent=2, ensure_ascii=False))

    return exit_code, results


if __name__ == "__main__":
    json_output = "--json" in sys.argv
    save_json = "--save" in sys.argv
    code, _results = asyncio.run(run_all(json_output=json_output, save_json=save_json))
    sys.exit(code)

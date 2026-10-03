import asyncio
import json
from playwright.async_api import async_playwright

VERCEL_URL = "https://political-manager.vercel.app"
CAMPAIGN_ID = "3814789d-48d8-4f0d-a7bd-6ea9dd8c721e"
BOOTH_1_ID = "97c83c51-eaab-4479-ac5d-3f080550f8c0"
BOOTH_2_ID = "1ccac0ac-24f7-41a3-aab3-ad90c1d98ce2"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("[TEST] Logging into Vercel production...")
        await page.goto(f"{VERCEL_URL}/login", wait_until="load")
        await page.fill('input[type="text"], input[type="email"]', "admin@campaignops.ai")
        await page.fill('input[type="password"]', "password123")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2500)
        print(f"[TEST] Logged in. Current URL: {page.url}")

        # 1. Campaign wide
        print("\n--- 1. Testing Campaign Wide Voters URL ---")
        url_all = f"{VERCEL_URL}/campaigns/{CAMPAIGN_ID}/voters"
        await page.goto(url_all, wait_until="load")
        await page.wait_for_timeout(2000)
        heading_all = await page.inner_text("h1")
        total_voters_card = await page.inner_text("text=Total Voters >> xpath=.. >> xpath=span[2]")
        rows_all = await page.locator("tbody tr").count()
        content_all = await page.content()
        print(f"URL: {url_all}")
        print(f"Heading: {heading_all}")
        print(f"Total Voters Stat Card: {total_voters_card}")
        print(f"Visible Rows Count: {rows_all}")
        print(f"Contains QA Synthetic Person A: {'QA Synthetic Person A' in content_all}")
        print(f"Contains QA Synthetic Person B: {'QA Synthetic Person B' in content_all}")

        # 2. Booth 1
        print("\n--- 2. Testing Booth 1 Scope URL ---")
        url_b1 = f"{VERCEL_URL}/campaigns/{CAMPAIGN_ID}/voters?boothId={BOOTH_1_ID}"
        await page.goto(url_b1, wait_until="load")
        await page.wait_for_timeout(2000)
        heading_b1 = await page.inner_text("h1")
        total_voters_card_b1 = await page.inner_text("text=Total Voters >> xpath=.. >> xpath=span[2]")
        rows_b1 = await page.locator("tbody tr").count()
        content_b1 = await page.content()
        print(f"URL: {url_b1}")
        print(f"Heading: {heading_b1}")
        print(f"Total Voters Stat Card: {total_voters_card_b1}")
        print(f"Visible Rows Count: {rows_b1}")
        print(f"Contains QA Synthetic Person A: {'QA Synthetic Person A' in content_b1}")
        print(f"Contains QA Synthetic Person B: {'QA Synthetic Person B' in content_b1}")

        # 3. Booth 2
        print("\n--- 3. Testing Booth 2 Scope URL ---")
        url_b2 = f"{VERCEL_URL}/campaigns/{CAMPAIGN_ID}/voters?boothId={BOOTH_2_ID}"
        await page.goto(url_b2, wait_until="load")
        await page.wait_for_timeout(2000)
        heading_b2 = await page.inner_text("h1")
        total_voters_card_b2 = await page.inner_text("text=Total Voters >> xpath=.. >> xpath=span[2]")
        rows_b2 = await page.locator("tbody tr").count()
        content_b2 = await page.content()
        print(f"URL: {url_b2}")
        print(f"Heading: {heading_b2}")
        print(f"Total Voters Stat Card: {total_voters_card_b2}")
        print(f"Visible Rows Count: {rows_b2}")
        print(f"Contains QA Synthetic Person A: {'QA Synthetic Person A' in content_b2}")
        print(f"Contains 'No voters matching query': {'No voters matching query' in content_b2}")

        # 4. Check QA-010 Household links & Unassigned badges
        print("\n--- 4. Checking Household Links & Unassigned on Booth 1 ---")
        await page.goto(url_b1, wait_until="load")
        await page.wait_for_timeout(2000)
        hh_links = await page.eval_on_selector_all('tbody tr a[href*="/households/"]', 'els => els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute("href") }))')
        unassigned_spans = await page.eval_on_selector_all('tbody tr span:has-text("Unassigned")', 'els => els.map(e => e.innerText.trim())')
        print(f"Found household links: {hh_links}")
        print(f"Found unassigned badges: {unassigned_spans}")

        await browser.close()
        print("\n[TEST] All browser verifications completed.")

if __name__ == "__main__":
    asyncio.run(main())

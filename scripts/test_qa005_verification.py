import asyncio
from playwright.async_api import async_playwright

VERCEL_URL = "https://political-manager.vercel.app"
QA_CAMPAIGN_ID = "3814789d-48d8-4f0d-a7bd-6ea9dd8c721e"

async def test_qa005():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("\n--- 1. Login as Super Admin ---")
        await page.goto(f"{VERCEL_URL}/login", wait_until="load", timeout=25000)
        await page.fill('input[type="text"], input[type="email"]', "admin@campaignops.ai")
        await page.fill('input[type="password"]', "password123")
        await page.click('button[type="submit"]')

        for _ in range(25):
            await asyncio.sleep(1)
            if "/login" not in page.url:
                break
        print(f"Logged in successfully. Current URL: {page.url}")

        print("\n--- 2. Inspect /super-admin/campaigns Directory ---")
        await page.goto(f"{VERCEL_URL}/super-admin/campaigns", wait_until="load", timeout=25000)
        content = await page.content()

        # Check if QA campaign is visible
        has_qa_campaign = "QA Synthetic Setup 20260930 A" in content
        print(f"QA Synthetic Setup 20260930 A visible: {has_qa_campaign}")

        # Check for Resume Setup button
        resume_links = await page.locator(f'a[href*="/campaigns/new?campaignId={QA_CAMPAIGN_ID}"]').count()
        print(f"Resume Setup links pointing to {QA_CAMPAIGN_ID}: {resume_links}")

        print("\n--- 3. Click Resume Setup and inspect Wizard ---")
        await page.goto(f"{VERCEL_URL}/campaigns/new?campaignId={QA_CAMPAIGN_ID}", wait_until="load", timeout=25000)
        await asyncio.sleep(3) # allow client fetching
        
        wizard_content = await page.content()
        print(f"Wizard URL: {page.url}")
        print(f"Has 'RESUMING EXISTING INSTANCE' badge: {'RESUMING EXISTING INSTANCE' in wizard_content}")
        print(f"Has 'Village 1': {'Village 1' in wizard_content}")
        print(f"Has 'Village 2': {'Village 2' in wizard_content}")
        print(f"Has 'Booth 1 - Village 1': {'Booth 1 - Village 1' in wizard_content}")
        print(f"Has 'Booth 4 - Village 2': {'Booth 4 - Village 2' in wizard_content}")

        print("\n--- 4. Check /campaigns/[id] Incomplete Setup Banner ---")
        await page.goto(f"{VERCEL_URL}/campaigns/{QA_CAMPAIGN_ID}", wait_until="load", timeout=25000)
        dash_content = await page.content()
        print(f"Dashboard URL: {page.url}")
        print(f"Has 'Campaign Setup Incomplete' alert: {'Campaign Setup Incomplete' in dash_content}")
        print(f"Has 'Resume Setup Wizard' button: {'Resume Setup Wizard' in dash_content}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_qa005())

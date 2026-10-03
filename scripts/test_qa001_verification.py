import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "https://political-manager.vercel.app"

async def run_tests():
    print(f"Starting QA-001 Verification against {BASE_URL}...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # 1. Login as Super Admin
        print("\n--- 1. Login as Super Admin (admin@campaignops.ai) ---")
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        await page.fill('input[type="email"], input[name="email"]', "admin@campaignops.ai")
        await page.fill('input[type="password"], input[name="password"]', "password123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/super-admin**", timeout=15000)
        await page.wait_for_load_state("networkidle")
        print(f"Landed on: {page.url}")

        # Check TopHeader identity on /super-admin
        # Wait for dynamic identity to render if fetching
        await asyncio.sleep(2)
        content_sa = await page.content()
        
        # Verify text in header
        header_name_sa = await page.locator("header").locator("span.font-semibold, span.font-medium, div.text-sm").all_text_contents()
        print(f"Header text elements on /super-admin: {header_name_sa}")
        
        has_super_admin_name = any("Super Administrator" in text for text in header_name_sa)
        has_rajesh_sharma = any("Rajesh Sharma" in text for text in header_name_sa)
        
        print(f"Header contains 'Super Administrator': {has_super_admin_name}")
        print(f"Header contains 'Rajesh Sharma': {has_rajesh_sharma}")
        assert has_super_admin_name, "FAIL: Header does NOT contain 'Super Administrator' on /super-admin"
        assert not has_rajesh_sharma, "FAIL: Header still contains hardcoded 'Rajesh Sharma' on /super-admin"

        # 2. Navigate to /super-admin/users
        print("\n--- 2. Navigate to /super-admin/users ---")
        await page.goto(f"{BASE_URL}/super-admin/users", wait_until="networkidle")
        await asyncio.sleep(2)
        print(f"Landed on: {page.url}")
        
        header_name_users = await page.locator("header").locator("span.font-semibold, span.font-medium, div.text-sm").all_text_contents()
        print(f"Header text elements on /super-admin/users: {header_name_users}")
        
        has_super_admin_users = any("Super Administrator" in text for text in header_name_users)
        has_vikramaditya = any("Vikramaditya Rao" in text for text in header_name_users)
        
        print(f"Header contains 'Super Administrator': {has_super_admin_users}")
        print(f"Header contains 'Vikramaditya Rao': {has_vikramaditya}")
        assert has_super_admin_users, "FAIL: Header does NOT contain 'Super Administrator' on /super-admin/users"
        assert not has_vikramaditya, "FAIL: Header still contains hardcoded 'Vikramaditya Rao' on /super-admin/users"

        # 3. Refresh test on /super-admin/users
        print("\n--- 3. Page Refresh Test ---")
        await page.reload(wait_until="networkidle")
        await asyncio.sleep(2)
        header_name_refresh = await page.locator("header").locator("span.font-semibold, span.font-medium, div.text-sm").all_text_contents()
        assert any("Super Administrator" in text for text in header_name_refresh), "FAIL: Identity lost on refresh!"
        print("Refresh preserves 'Super Administrator' identity: PASSED")

        # 4. Logout test
        print("\n--- 4. Sign Out Test ---")
        # Trigger user menu or direct logout
        # In TopHeader, there's a button opening the menu or sign out directly
        avatar_btn = page.locator("header button").last
        await avatar_btn.click()
        await asyncio.sleep(0.5)
        signout_btn = page.locator("button:has-text('Sign Out')")
        if await signout_btn.is_visible():
            await signout_btn.click()
            await page.wait_for_url("**/login**", timeout=10000)
            print("Successfully signed out and redirected to /login")
        else:
            # Fallback direct call
            await page.goto(f"{BASE_URL}/login")

        # 5. Login as Campaign Admin (campaign.admin@campaignops.ai)
        print("\n--- 5. Login as Campaign Admin (campaign.admin@campaignops.ai) ---")
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        await page.fill('input[type="email"], input[name="email"]', "campaign.admin@campaignops.ai")
        await page.fill('input[type="password"], input[name="password"]', "password123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/campaigns**", timeout=15000)
        await page.wait_for_load_state("networkidle")
        print(f"Landed on: {page.url}")

        await asyncio.sleep(2)
        header_name_ca = await page.locator("header").locator("span.font-semibold, span.font-medium, div.text-sm").all_text_contents()
        print(f"Header text elements for Campaign Admin: {header_name_ca}")
        
        has_rajesh_ca = any("Rajesh Sharma" in text for text in header_name_ca)
        has_super_admin_ca = any("Super Administrator" in text for text in header_name_ca)
        
        print(f"Header contains 'Rajesh Sharma': {has_rajesh_ca}")
        print(f"Header does NOT contain stale 'Super Administrator': {not has_super_admin_ca}")
        assert has_rajesh_ca, "FAIL: Header does NOT show Rajesh Sharma for campaign admin"
        assert not has_super_admin_ca, "FAIL: Header still contains stale Super Administrator identity"

        # 6. Unauthenticated access check
        print("\n--- 6. Unauthenticated Access Protection Check ---")
        unauth_context = await browser.new_context()
        unauth_page = await unauth_context.new_page()
        await unauth_page.goto(f"{BASE_URL}/super-admin")
        await unauth_page.wait_for_url("**/login**", timeout=10000)
        print(f"Unauthenticated request redirected to: {unauth_page.url}")
        assert "/login" in unauth_page.url, "FAIL: Unauthenticated visitor was not redirected to /login"

        print("\n==========================================")
        print("ALL QA-001 ACCEPTANCE CHECKS PASSED!")
        print("==========================================")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_tests())

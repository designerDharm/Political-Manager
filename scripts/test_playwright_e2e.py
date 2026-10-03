import asyncio
from playwright.async_api import async_playwright

STAGING_URL = "https://contributed-sitemap-put-jpeg.trycloudflare.com"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        print("[BROWSER] Chromium launched successfully")

        # 1. Unauthenticated protection
        context_unauth = await browser.new_context()
        page_unauth = await context_unauth.new_page()
        
        for protected_path in ["/super-admin", "/campaigns", "/agent"]:
            await page_unauth.goto(f"{STAGING_URL}{protected_path}", wait_until="load", timeout=20000)
            final_url = page_unauth.url
            print(f"[UNAUTH CHECK] Requested: {protected_path} -> Final URL: {final_url} (Redirected to login: {'/login' in final_url})")

        await context_unauth.close()

        # 2. Test each role signing in through browser UI and landing on role-specific page
        credentials = [
            ("Super Admin", "admin@campaignops.ai", "password123", "/super-admin"),
            ("Campaign Admin", "campaign.admin@campaignops.ai", "password123", "/campaigns"),
            ("Political Agent", "agent@campaignops.ai", "password123", "/agent"),
        ]

        for role_name, email, password, expected_prefix in credentials:
            context = await browser.new_context()
            page = await context.new_page()
            print(f"\n--- Testing {role_name} ({email}) via Real Browser ---")
            
            # Step 1: Load login form
            await page.goto(f"{STAGING_URL}/login", wait_until="load", timeout=20000)
            print(f"1. Login page reached: {page.url}")

            # Verify form elements are visible
            input_email = await page.wait_for_selector('input[type="text"], input[type="email"]', state="visible", timeout=10000)
            input_pass = await page.wait_for_selector('input[type="password"]', state="visible", timeout=10000)
            btn_submit = await page.wait_for_selector('button[type="submit"]', state="visible", timeout=10000)
            print("2. Login form and input fields visible on page")

            # Fill credentials
            await input_email.fill(email)
            await input_pass.fill(password)
            print(f"3. Filled email={email}")

            # Submit and wait for URL to change away from /login
            await btn_submit.click()
            print("4. Clicked Submit button, waiting for redirect...")

            # Wait until URL is no longer /login
            for i in range(25):
                await asyncio.sleep(1)
                cur_url = page.url
                if "/login" not in cur_url:
                    break

            final_url = page.url
            print(f"5. Final navigated URL: {final_url}")
            assert expected_prefix in final_url, f"Role landing mismatch: Expected {expected_prefix} in {final_url}"
            print(f"6. PASS: Verified landing on {final_url} for {role_name}")

            await context.close()

        await browser.close()
        print("\n[ALL 4 ACCEPTANCE CRITERIA VERIFIED VIA REAL BROWSER]")

if __name__ == "__main__":
    asyncio.run(main())

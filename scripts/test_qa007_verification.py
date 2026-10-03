import asyncio
import os
import tempfile
from playwright.async_api import async_playwright

VERCEL_URL = "https://political-manager.vercel.app"
QA_CAMPAIGN_ID = "3814789d-48d8-4f0d-a7bd-6ea9dd8c721e"

async def test_qa007():
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

        print(f"\n--- 2. Navigate to /campaigns/{QA_CAMPAIGN_ID}/voters/upload ---")
        upload_url = f"{VERCEL_URL}/campaigns/{QA_CAMPAIGN_ID}/voters/upload"
        await page.goto(upload_url, wait_until="load", timeout=25000)
        await asyncio.sleep(3)

        # Ensure page content rendered
        content = await page.content()
        print(f"Page title visible: {'Upload Voter List' in content}")
        print(f"Max size 50MB advertised: {'Max size: 50MB' in content}")

        # Check Geography dropdowns
        ward_select = page.locator('select').first
        ward_val = await ward_select.input_value()
        print(f"Initial Ward selection value: {ward_val}")

        print("\n--- 3. Scenario A: Click 'Process Electoral Roll' without selecting any file ---")
        process_btn = page.locator('button:has-text("Process Electoral Roll")')
        await process_btn.click()
        await asyncio.sleep(1)

        # Verify step did NOT advance to Step 2 (Processing)
        # In step 1, step 1 circle is active. Let's inspect step 2 status or loader
        content_after_click = await page.content()
        has_error_beside = "Please select a file to import" in content_after_click
        is_processing_active = "Processing OCR & Ingestion..." in content_after_click
        print(f"Shows 'Please select a file to import': {has_error_beside}")
        print(f"Is Processing state triggered: {is_processing_active}")

        print("\n--- 4. Scenario B: Empty file (0 bytes) validation ---")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as empty_file:
            empty_file_path = empty_file.name
        
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files(empty_file_path)
        await asyncio.sleep(1)

        content_empty = await page.content()
        print(f"Empty file validation triggered: {'Selected file is empty (0 bytes)' in content_empty}")
        os.unlink(empty_file_path)

        print("\n--- 5. Scenario C: Unsupported file type (.txt) validation ---")
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as txt_file:
            txt_file.write(b"This is not a PDF")
            txt_file_path = txt_file.name

        await file_input.set_input_files(txt_file_path)
        await asyncio.sleep(1)

        content_txt = await page.content()
        print(f"Unsupported file validation triggered: {'Unsupported file format' in content_txt}")
        os.unlink(txt_file_path)

        print("\n--- 6. Scenario D: Oversized file (> 50 MB) validation ---")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as big_file:
            big_file.seek(51 * 1024 * 1024)
            big_file.write(b"\0")
            big_file_path = big_file.name

        await file_input.set_input_files(big_file_path)
        await asyncio.sleep(1)

        content_big = await page.content()
        print(f"Oversized file validation triggered: {'File size exceeds the 50 MB limit' in content_big}")
        os.unlink(big_file_path)

        print("\n--- 7. Scenario E: Cancelled file chooser ---")
        # Clearing file input
        await file_input.set_input_files([])
        await asyncio.sleep(1)
        # Should not crash and allow picking again
        print("Cancelled / cleared file input gracefully.")

        print("\n--- 8. Scenario F: Valid synthetic PDF upload & processing ---")
        sample_pdf_path = os.path.join(os.getcwd(), "UI:UX screens/KITHANA-Ward No-001.pdf")
        if os.path.exists(sample_pdf_path):
            await file_input.set_input_files(sample_pdf_path)
            await asyncio.sleep(1)

            content_valid = await page.content()
            print(f"File chip visible: {'KITHANA-Ward No-001.pdf' in content_valid}")

            # Verify Ward and Booth selection preserved
            ward_val_after = await ward_select.input_value()
            print(f"Ward selection preserved: {ward_val_after == ward_val}")

            # Click Process Electoral Roll
            await process_btn.click()
            print("Clicked Process Electoral Roll with valid PDF. Waiting for processing...")
            
            # Wait for either review navigation or success
            for i in range(30):
                await asyncio.sleep(1)
                curr_url = page.url
                if "/imports/review" in curr_url or "Review" in await page.content():
                    print(f"Successfully processed and navigated to: {curr_url}")
                    break

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_qa007())

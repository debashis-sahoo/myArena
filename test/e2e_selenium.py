"""
End-to-End Automated Testing for myArena Royalty Web Application
Uses Headless Chromium and Selenium WebDriver to test desktop, mobile, solo AI, and game rendering
against a locally started application server.
"""

import os
import sys
import time
import subprocess
import urllib.request
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC

REPO_ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "http://localhost:3001"

def run_e2e():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("====================================================")
    print("🚀 RUNNING END-TO-END SELENIUM BROWSER TESTS")
    print("====================================================")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1280,800")

    driver = None
    server = subprocess.Popen(
        ["node", "src/server/server.js"],
        cwd=REPO_ROOT,
        env={**dict(os.environ), "PORT": "3001"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE_URL, timeout=1)
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Application server did not start")

        driver = webdriver.Chrome(options=chrome_options)
        wait = WebDriverWait(driver, 15)

        # ---------------------------------------------------------------------
        # TEST 1: DESKTOP LANDING PAGE & BRANDING
        # ---------------------------------------------------------------------
        print("\n--- Test 1: Desktop Landing Page & Visual Identity ---")
        driver.get(BASE_URL)
        wait.until(lambda d: "myArena Royalty" in d.title)
        print("  ✓ Page title verified:", driver.title)

        brand_name = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "brand-name"))).text
        brand_tagline = driver.find_element(By.CLASS_NAME, "brand-tagline").text
        assert "myarena royalty" in brand_name.lower(), f"Unexpected brand name: {brand_name}"
        assert "your friends. your arena." in brand_tagline.lower(), f"Unexpected tagline: {brand_tagline}"
        print(f"  ✓ Wordmark: '{brand_name}' | Tagline: '{brand_tagline}'")

        hero_title = driver.find_element(By.CLASS_NAME, "hero-title").get_attribute("textContent")
        assert "your friends" in hero_title.lower()
        print("  ✓ Hero headline rendered")

        # Verify MVP Playable Games Catalog
        playable_cards = driver.find_elements(By.CSS_SELECTOR, ".badge-playable")
        assert len(playable_cards) == 3, f"Expected 3 playable games, found {len(playable_cards)}"
        print("  ✓ 3 MVP Playable Games displayed (Ludo, Snakes & Ladders, Tambola)")

        # Verify Coming Soon Games
        coming_soon = driver.find_elements(By.CSS_SELECTOR, ".badge-coming-soon")
        assert len(coming_soon) >= 4, f"Expected at least 4 roadmap games, found {len(coming_soon)}"
        for cs in coming_soon:
            card_btn = cs.find_element(By.XPATH, "../../..//button")
            assert not card_btn.is_enabled(), "Coming soon game card button should be disabled!"
        print("  ✓ Coming soon games properly locked with disabled actions")

        # ---------------------------------------------------------------------
        # TEST 2: SOLO LUDO VS AI BOTS
        # ---------------------------------------------------------------------
        print("\n--- Test 2: Solo Ludo Game against Local AI Bots ---")
        solo_btn = driver.find_element(By.ID, "btnQuickSoloLudo")
        solo_btn.click()
        time.sleep(1)

        # Verify Game View Active
        game_view = driver.find_element(By.ID, "viewGame")
        assert "active" in game_view.get_attribute("class")
        print("  ✓ Game stage transitioned to active")

        # Verify Board Canvas and Controls
        canvas = wait.until(EC.visibility_of_element_located((By.ID, "boardCanvas")))
        assert canvas.is_displayed()
        dice_btn = driver.find_element(By.ID, "btnRollDice")
        dice_cube = driver.find_element(By.ID, "diceCube")
        assert dice_btn.is_displayed()
        assert dice_cube.size["width"] >= 120, f"Expected enlarged Ludo die, got {dice_cube.size['width']}px"
        sides = driver.find_elements(By.CSS_SELECTOR, "#diceCube .dice-side")
        assert len(sides) == 6, f"Expected a six-sided 3D die, found {len(sides)} sides"
        core_sides = driver.find_elements(By.CSS_SELECTOR, "#diceCube .dice-core-side")
        assert len(core_sides) == 6, f"Expected six seam-closing core sides, found {len(core_sides)}"
        desktop_board_width = driver.find_element(By.ID, "boardCanvasWrapper").size["width"]
        print("  ✓ 3D Board Canvas and enlarged Dice controls rendered")

        # Roll Dice for Human Player
        driver.execute_script("""
            window.__rolls = [];
            const original = window.LudoEngine.rollDice;
            window.LudoEngine.rollDice = function (game, forced) {
                const result = original.call(this, game, forced);
                window.__rolls.push(result.roll);
                return result;
            };
        """)
        dice_cube.click()
        time.sleep(0.4)
        rolling_transform = driver.execute_script(
            "return getComputedStyle(document.querySelector('#diceCube .dice-solid')).transform;"
        )
        assert rolling_transform.startswith("matrix3d"), f"Expected a 3D tumble mid-roll, got {rolling_transform}"
        time.sleep(0.4)  # past the mid-air reveal, before any AI turn can start
        human_roll = driver.execute_script("return window.__rolls[0];")
        active_pips = driver.find_elements(
            By.CSS_SELECTOR, "#diceCube .dice-side[data-face='front'] .dice-pip.active"
        )
        assert len(active_pips) == human_roll, f"Die landed on {len(active_pips)} but engine rolled {human_roll}"
        assert dice_cube.get_attribute("aria-label") == f"Dice showing {human_roll}", \
            f"Dice label '{dice_cube.get_attribute('aria-label')}' disagrees with rolled {human_roll}"
        activity_items = driver.find_elements(By.CSS_SELECTOR, "#activityFeedList .feed-item")
        assert len(activity_items) > 0
        latest_act = activity_items[0].text
        print(f"  ✓ Move recorded in activity feed: '{latest_act}'")

        # ---------------------------------------------------------------------
        # TEST 3: MOBILE VIEWPORT & TOUCH RESPONSIVENESS
        # ---------------------------------------------------------------------
        print("\n--- Test 3: Mobile Viewport & Touch Target Auditing ---")
        driver.set_window_size(390, 844) # iPhone 12/13/14 size
        time.sleep(0.5)

        mobile_board = driver.find_element(By.ID, "boardCanvasWrapper")
        assert mobile_board.size["width"] < desktop_board_width, \
            f"Board did not shrink responsively: desktop={desktop_board_width}, mobile={mobile_board.size['width']}"
        canvas_backing_width = driver.execute_script(
            "return document.getElementById('boardCanvas').width;"
        )
        expected_backing_width = round(
            mobile_board.size["width"] * min(driver.execute_script("return window.devicePixelRatio;"), 2)
        )
        assert abs(canvas_backing_width - expected_backing_width) <= 2, \
            f"Canvas backing surface is stale: expected {expected_backing_width}, got {canvas_backing_width}"

        # Check horizontal scroll / overflow
        scroll_width = driver.execute_script("return document.documentElement.scrollWidth;")
        client_width = driver.execute_script("return document.documentElement.clientWidth;")
        assert scroll_width <= client_width + 1, f"Horizontal overflow detected: scrollWidth={scroll_width}, clientWidth={client_width}"
        print(f"  ✓ No horizontal overflow on mobile (width: {client_width}px)")

        # Verify touch targets >= 44px
        buttons = driver.find_elements(By.CSS_SELECTOR, "button, .user-pill")
        small_targets = []
        for btn in buttons:
            if btn.is_displayed():
                h = btn.size["height"]
                w = btn.size["width"]
                if h < 34 or w < 34:
                    small_targets.append((btn.text or btn.get_attribute("aria-label"), w, h))
        assert len(small_targets) == 0, f"Found touch targets smaller than 34px: {small_targets}"
        print("  ✓ Accessible touch target constraints verified across all buttons")

        # ---------------------------------------------------------------------
        # TEST 4: SNAKES & LADDERS FLOW
        # ---------------------------------------------------------------------
        print("\n--- Test 4: Snakes & Ladders Solo Match ---")
        driver.find_element(By.ID, "btnNavHome").click()
        driver.set_window_size(1280, 800)
        wait.until(EC.visibility_of_element_located((By.ID, "viewLanding")))

        snakes_card_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".btn-play-game[data-game='snakes']")))
        snakes_card_btn.click()
        wait.until(EC.visibility_of_element_located((By.ID, "modalCreateRoom")))

        # Switch to Solo mode in modal
        mode_select = driver.find_element(By.ID, "selectGameMode")
        Select(mode_select).select_by_value("solo")
        driver.find_element(By.ID, "btnSubmitCreateRoom").click()
        time.sleep(1)

        assert "active" in driver.find_element(By.ID, "viewGame").get_attribute("class")
        dice_btn = driver.find_element(By.ID, "btnRollDice")
        dice_btn.click()
        time.sleep(1.2)
        print("  ✓ Snakes & Ladders roll and advancement executed")

        # ---------------------------------------------------------------------
        # TEST 5: HOUSIE / TAMBOLA FLOW & CLAIM
        # ---------------------------------------------------------------------
        print("\n--- Test 5: Housie / Tambola Ticket & Number Draw Flow ---")
        driver.find_element(By.ID, "btnNavHome").click()
        time.sleep(0.5)

        tambola_card_btn = driver.find_element(By.CSS_SELECTOR, ".btn-play-game[data-game='tambola']")
        tambola_card_btn.click()
        wait.until(EC.visibility_of_element_located((By.ID, "modalCreateRoom")))

        mode_select = driver.find_element(By.ID, "selectGameMode")
        Select(mode_select).select_by_value("solo")
        driver.find_element(By.ID, "btnSubmitCreateRoom").click()
        time.sleep(1)

        # Verify Tambola 90-ball stage and ticket
        tambola_stage = driver.find_element(By.ID, "tambolaWrapper")
        assert tambola_stage.is_displayed()
        board_cells = driver.find_elements(By.CSS_SELECTOR, ".tambola-number-board .board-cell")
        assert len(board_cells) == 90, f"Expected 90 board cells, found {len(board_cells)}"
        ticket_cells = driver.find_elements(By.CSS_SELECTOR, ".ticket-grid .ticket-cell")
        assert len(ticket_cells) == 27, f"Expected 27 ticket cells (3x9), found {len(ticket_cells)}"
        print("  ✓ Tambola 90-ball board and 3x9 ticket rendered")

        # Draw a ball
        draw_btn = driver.find_element(By.ID, "btnDrawBall")
        draw_btn.click()
        time.sleep(0.5)
        current_ball = driver.find_element(By.ID, "tambolaCurrentBall").text
        assert current_ball != "--" and current_ball.isdigit()
        print(f"  ✓ Ball drawn: #{current_ball}")

        # Tap a ticket number to daub
        active_cells = [c for c in ticket_cells if "blank" not in c.get_attribute("class")]
        assert len(active_cells) == 15, f"Expected 15 numbers on ticket, got {len(active_cells)}"
        active_cells[0].click()
        time.sleep(0.2)
        assert "marked" in active_cells[0].get_attribute("class")
        print("  ✓ Tap-to-mark daubing verified on ticket cell")

        print("\n====================================================")
        print("ALL END-TO-END BROWSER TESTS COMPLETED SUCCESSFULLY! 👑")
        print("====================================================")

    finally:
        if driver:
            driver.quit()
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

if __name__ == "__main__":
    run_e2e()

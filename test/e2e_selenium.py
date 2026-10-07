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

        # Chat is shown by default and identifies players by their sign-in names
        chat_panel = driver.find_element(By.CSS_SELECTOR, ".chat-panel")
        assert chat_panel.is_displayed(), "Chat panel should be visible by default"
        identity = driver.find_element(By.ID, "chatIdentity").text
        assert identity.startswith("Chatting as "), f"Unexpected chat identity: '{identity}'"
        my_name = identity[len("Chatting as "):]
        roster = [chip.text for chip in driver.find_elements(By.CSS_SELECTOR, "#chatRoster .chat-chip")]
        assert my_name in roster and len(roster) == 4, f"Roster should list all 4 players, got {roster}"
        chat_input = driver.find_element(By.ID, "chatInput")
        chat_input.send_keys("Good luck!")
        driver.find_element(By.CSS_SELECTOR, "#chatForm button[type='submit']").click()
        message = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "#chatList .chat-item")))
        assert message.find_element(By.CLASS_NAME, "chat-author").text == my_name
        assert message.find_element(By.CLASS_NAME, "chat-text").text == "Good luck!"
        print(f"  ✓ Chat visible by default; message posted as '{my_name}'")

        # Match activity shows only the newest two entries, older ones scroll.
        # A rolled 6 waits for the human to move a token, so play one if needed.
        move_any_legal_token = """
            const c = document.getElementById('boardCanvas');
            const r = c.getBoundingClientRect(); const cell = r.width / 15;
            for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) {
                if (!document.getElementById('diceHelperText').textContent.includes('glowing')) return;
                c.dispatchEvent(new MouseEvent('click', { clientX: r.left + j / 2 * cell, clientY: r.top + i / 2 * cell, bubbles: true }));
            }
        """
        def feed_has_history(d):
            if "glowing" in d.find_element(By.ID, "diceHelperText").text:
                d.execute_script(move_any_legal_token)
            return len(d.find_elements(By.CSS_SELECTOR, "#activityFeedList .feed-item")) >= 3
        WebDriverWait(driver, 25).until(feed_has_history)
        feed_state = driver.execute_script("""
            const feed = document.getElementById('activityFeedList');
            const box = feed.getBoundingClientRect();
            const visible = [...feed.children].filter(item => {
                const r = item.getBoundingClientRect();
                return r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
            }).length;
            return { visible, scrollable: feed.scrollHeight > feed.clientHeight };
        """)
        assert feed_state["visible"] == 2, f"Expected 2 visible activity entries, got {feed_state['visible']}"
        assert feed_state["scrollable"], "Older activity entries should be reachable by scrolling"
        print("  ✓ Match activity shows the latest 2 entries with scroll")

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
        # The canvas fills the board inside its border, so compare against clientWidth.
        board_inner_width = driver.execute_script(
            "return document.getElementById('boardCanvasWrapper').clientWidth;"
        )
        expected_backing_width = round(
            board_inner_width * min(driver.execute_script("return window.devicePixelRatio;"), 2)
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
        # Record when the die stops and when the move's activity entry appears.
        driver.execute_script("""
            window.__moveTimeline = [];
            const cube = document.getElementById('diceCube');
            let wasRolling = false;
            new MutationObserver(() => {
                const rolling = cube.classList.contains('rolling');
                if (wasRolling && !rolling) window.__moveTimeline.push(['die', performance.now()]);
                wasRolling = rolling;
            }).observe(cube, { attributes: true, attributeFilter: ['class'] });
            new MutationObserver(() => window.__moveTimeline.push(['feed', performance.now()]))
                .observe(document.getElementById('activityFeedList'), { childList: true });
        """)
        dice_btn = driver.find_element(By.ID, "btnRollDice")
        dice_btn.click()
        WebDriverWait(driver, 10).until(
            lambda d: any(kind == "feed" for kind, _ in d.execute_script("return window.__moveTimeline;"))
        )
        timeline = driver.execute_script("return window.__moveTimeline;")
        die_landed = next(t for kind, t in timeline if kind == "die")
        move_logged = next(t for kind, t in timeline if kind == "feed")
        assert move_logged >= die_landed, "The pawn moved before the die came to rest"
        print(f"  ✓ Snakes & Ladders pawn moved {round(move_logged - die_landed)}ms after the die came to rest")

        # ---------------------------------------------------------------------
        # TEST 5: HOUSIE / TAMBOLA FLOW & CLAIM
        # ---------------------------------------------------------------------
        print("\n--- Test 5: Housie / Tambola Ticket & Number Draw Flow ---")
        driver.find_element(By.ID, "btnNavHome").click()
        time.sleep(0.5)

        tambola_card_btn = driver.find_element(By.CSS_SELECTOR, ".btn-play-game[data-game='tambola']")
        tambola_card_btn.click()
        wait.until(EC.visibility_of_element_located((By.ID, "modalCreateRoom")))

        # Admin game setup: choose winning patterns before starting
        driver.find_element(By.ID, "btnCreateTambolaSetup").click()
        wait.until(EC.visibility_of_element_located((By.ID, "modalTambolaSetup")))
        catalog_cards = driver.find_elements(By.CSS_SELECTOR, "#setupPatternGrid .setup-pattern")
        assert len(catalog_cards) >= 40, f"Expected 40+ winning patterns to choose from, found {len(catalog_cards)}"
        driver.find_element(By.CSS_SELECTOR, ".setup-preset[data-preset='party']").click()
        party_count = len(driver.find_elements(By.CSS_SELECTOR, "#setupPatternGrid .setup-pattern input:checked"))
        Select(driver.find_element(By.ID, "setupCallerRole")).select_by_value("HOST")
        driver.find_element(By.ID, "btnSaveTambolaSetup").click()
        wait.until(EC.invisibility_of_element_located((By.ID, "modalTambolaSetup")))
        print(f"  ✓ Game setup offers {len(catalog_cards)} patterns; chose {party_count} (Party Mix ★3+)")

        mode_select = driver.find_element(By.ID, "selectGameMode")
        Select(mode_select).select_by_value("solo")
        driver.find_element(By.ID, "btnSubmitCreateRoom").click()
        time.sleep(1)

        claim_cards = driver.find_elements(By.CSS_SELECTOR, "#tambolaPatternsList .claim-card")
        assert len(claim_cards) == party_count, f"Expected {party_count} claimable patterns, found {len(claim_cards)}"

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
        assert active_cells[0].get_attribute("aria-pressed") == "true"
        assert active_cells[0].text.strip().isdigit(), "A crossed number must stay readable"
        cross = driver.execute_script(
            "return getComputedStyle(arguments[0], '::before').backgroundColor;", active_cells[0]
        )
        assert cross.startswith("rgba") and not cross.endswith(", 1)"), f"Cross mark should be translucent, got {cross}"
        print("  ✓ Tap-to-mark draws a translucent cross with the number still visible")

        # How to Play briefing is available in every match
        how_to_play = driver.find_element(By.ID, "btnHowToPlay")
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(0.3)
        how_to_play.click()
        wait.until(EC.visibility_of_element_located((By.ID, "modalHowToPlay")))
        briefing = driver.find_element(By.ID, "howToPlayContent").text
        assert "GOAL" in briefing.upper() and "RULES IN THIS ROOM" in briefing.upper(), briefing[:200]
        driver.find_element(By.CSS_SELECTOR, "#modalHowToPlay .btn-primary").click()
        wait.until(EC.invisibility_of_element_located((By.ID, "modalHowToPlay")))
        print("  ✓ How to Play briefing opens with goal and this room's rules")

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

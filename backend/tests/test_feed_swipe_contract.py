from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HOME_SCREEN = ROOT / "mobile" / "src" / "screens" / "HomeScreen.tsx"


def read_home_screen() -> str:
    return HOME_SCREEN.read_text(encoding="utf-8")


def test_feed_uses_swipe_gestures_for_discovery_decisions():
    source = read_home_screen()

    assert "Animated" in source
    assert "PanResponder" in source
    assert "SWIPE_THRESHOLD" in source
    assert "completeSwipe('dislike'" in source
    assert "completeSwipe('like'" in source
    assert "handleDiscoveryDecision(decision, match)" in source


def test_feed_shows_directional_swipe_feedback_icons():
    source = read_home_screen()

    assert "rejectOpacity" in source
    assert "acceptOpacity" in source
    assert "styles.rejectCue" in source
    assert "styles.acceptCue" in source
    assert 'name="close"' in source
    assert 'name="checkmark"' in source


def test_feed_uses_pull_to_refresh_instead_of_refresh_button():
    source = read_home_screen()

    assert "RefreshControl" in source
    assert "refreshingFeed" in source
    assert "loadRankings(true)" in source
    assert "refreshBtn" not in source
    assert ">Refresh<" not in source

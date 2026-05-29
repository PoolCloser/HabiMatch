from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROFILE_PHOTO_SCREEN = ROOT / "mobile" / "src" / "screens" / "ProfilePhotoScreen.tsx"


def read_profile_photo_screen() -> str:
    return PROFILE_PHOTO_SCREEN.read_text(encoding="utf-8")


def test_default_avatar_uses_saved_profile_name():
    source = read_profile_photo_screen()

    assert "fetchProfileName" in source
    assert ".select('full_name')" in source
    assert "buildDefaultAvatarUrl(fullName)" in source
    assert "name=HabiMatch" not in source


def test_default_avatar_initials_use_first_two_name_parts_with_fallback():
    source = read_profile_photo_screen()

    assert "export function defaultAvatarInitials" in source
    assert "split(/\\s+/)" in source
    assert ".slice(0, 2)" in source
    assert ".charAt(0).toUpperCase()" in source
    assert "return initials || 'H'" in source


def test_default_avatar_url_passes_initials_to_ui_avatars():
    source = read_profile_photo_screen()

    assert "export function buildDefaultAvatarUrl" in source
    assert "initials.split('').join(' ')" in source
    assert "encodeURIComponent(avatarName)" in source
    assert "ui-avatars.com/api/" in source

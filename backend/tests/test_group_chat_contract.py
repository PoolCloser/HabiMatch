from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MESSAGING_MIGRATION = ROOT / "supabase" / "migrations" / "20260511000000_messaging_mutual_matches.sql"
GROUP_CHAT_MIGRATION = ROOT / "supabase" / "migrations" / "20260524000000_group_chat_creation.sql"
MESSAGING_LIB = ROOT / "mobile" / "src" / "lib" / "messaging.ts"
MESSAGES_SCREEN = ROOT / "mobile" / "src" / "screens" / "MessagesScreen.tsx"
CHAT_SCREEN = ROOT / "mobile" / "src" / "screens" / "ChatScreen.tsx"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def normalized_sql(path: Path) -> str:
    return " ".join(read(path).lower().split())


def messaging_sql() -> str:
    return " ".join([normalized_sql(MESSAGING_MIGRATION), normalized_sql(GROUP_CHAT_MIGRATION)])


def test_group_conversation_rpc_contract():
    sql = messaging_sql()

    assert "create or replace function public.create_group_conversation" in sql
    assert "participant_user_ids uuid[]" in sql
    assert "returns uuid" in sql
    assert "insert into public.conversations" in sql
    assert "is_group" in sql
    assert "true" in sql
    assert "insert into public.participants" in sql
    assert "unnest(participant_user_ids)" in sql
    assert "auth.uid()" in sql
    assert "grant execute on function public.create_group_conversation" in sql


def test_group_conversation_rpc_requires_mutual_matches():
    sql = messaging_sql()

    assert "create_group_conversation" in sql
    assert "is_mutual_match" in sql
    assert "not_mutual_match" in sql
    assert "invalid_participants" in sql


def test_conversation_list_supports_direct_and_group_previews():
    sql = messaging_sql()

    assert "list_my_conversations" in sql
    assert "is_group" in sql
    assert "participant_count" in sql
    assert "group_name" in sql or "conversation_name" in sql or "name" in sql
    assert "last_message_body" in sql
    assert "last_message_at" in sql
    assert "case when c.is_group" in sql
    assert "join public.conversations c on c.id = my_p.conversation_id and c.is_group = false" not in sql


def test_mobile_messaging_exports_group_creation_api():
    source = read(MESSAGING_LIB)

    assert "export type GroupParticipant" in source
    assert "export async function createGroupConversation" in source
    assert "create_group_conversation" in source
    assert "participant_user_ids" in source
    assert "group_name" in source


def test_mobile_conversation_preview_is_not_direct_only():
    source = read(MESSAGING_LIB)

    assert "isGroup: boolean" in source
    assert "title: string" in source
    assert "participantCount: number" in source
    assert "otherUserId: string;" not in source
    assert "otherFullName: string | null;" not in source


def test_messages_screen_has_group_creation_flow():
    source = read(MESSAGES_SCREEN)

    assert "fetchMutualMatches" in source
    assert "createGroupConversation" in source
    assert "New group" in source
    assert "Create group" in source
    assert "selectedParticipantIds" in source
    assert "participantCount" in source


def test_chat_screen_header_accepts_group_conversation_metadata():
    source = read(CHAT_SCREEN)

    assert "title: string" in source
    assert "subtitle: string" in source
    assert "isGroup: boolean" in source
    assert "otherUserId: string;" not in source
    assert "Mutual match" not in source

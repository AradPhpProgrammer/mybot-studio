"""Real DAG -> real worker delivery; only Telegram transport/DB are isolated."""
import pytest
from aiogram import types
from test_keyboard_attachment_validation import run_flow, node, edge
from test_keyboard_transition import StubBot
from app.bot_worker import KeyboardStateStore, MessageSender

@pytest.mark.asyncio
async def test_branch_dag_to_delivery_tracks_keyboard_not_parent(run_flow, tmp_path):
    sender = MessageSender(KeyboardStateStore(tmp_path / 'state.sqlite', 1))
    bot, last = StubBot(), {}

    async def execute(source, mode):
        result = await run_flow([
            node('start', 'trigger_start'),
            node('a', 'action_send_message', text='Branch A'),
            node('b', 'action_send_message', text='Branch B'),
            node(source, 'action_keyboard', keyboard_type=mode,
                 buttons=[[{'text':'Menu', 'callback_data':'menu'}]]),
        ], [edge('start','a'), edge('start','b'), edge('a',source)])
        assert result['success'] is True
        assert len(result['messages']) == 2
        a, b = result['messages']
        assert a['node_id'] == 'a'
        assert a['keyboard_node_id'] == source
        key = 'keyboard' if mode == 'reply' else 'inline_keyboard'
        assert a['reply_markup'][key][0][0]['text'] == 'Menu'
        assert b['text'] == 'Branch B'
        assert b['reply_markup'] == {'inline_keyboard': []}
        assert 'keyboard_node_id' not in b
        bot.calls.clear()
        for message in result['messages']:
            await sender.deliver(bot, 10, message, last)
        return bot.calls

    calls = await execute('X', 'reply')
    assert [name for name, _ in calls] == ['send_message','send_message']
    assert isinstance(calls[0][1]['reply_markup'], types.ReplyKeyboardMarkup)
    assert await sender.state.get(10) == {'kb_type':'reply','source_node_id':'X'}

    # Inline from another node must still remove the active reply keyboard.
    calls = await execute('Y', 'inline')
    # Inline from a different keyboard node still removes the active reply
    # keyboard: final content goes out with ReplyKeyboardRemove, inline attaches
    # to that same message.
    assert [name for name, _ in calls] == ['send_message','edit_message_reply_markup','send_message']
    assert isinstance(calls[0][1]['reply_markup'], types.ReplyKeyboardRemove)
    assert await sender.state.get(10) == {'kb_type':'inline','source_node_id':'Y'}

    calls = await execute('X', 'inline')
    # Y already switched the chat to inline, so X's inline is a plain delivery.
    assert [name for name, _ in calls] == ['send_message','send_message']
    assert calls[0][1]['text'] == 'Branch A'
    assert isinstance(calls[0][1]['reply_markup'], types.InlineKeyboardMarkup)
    assert calls[1][1]['text'] == 'Branch B'
    assert await sender.state.get(10) == {'kb_type':'inline','source_node_id':'X'}

import asyncio
import json
import functools

from fastapi import Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from openai import OpenAI

from chat import app, logger, models
from chat.crud import (
    create_message_controller,
    create_unread_message_controller,
    get_group_by_id,
    group_membership_check,
)
from chat.database import get_db
from chat.models import Message, User
from chat.utils.jwt import get_current_user

websocket_connections = {}


@app.websocket("/send-message")
async def send_messages_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    token = websocket.query_params.get("token")
    group_id = websocket.query_params.get("group_id")
    if token and group_id:
        user = await get_current_user(user_db=db, token=token)
        group_id = int(group_id)
    else:
        return await websocket.close(reason="You're not allowed", code=4403)

    is_group_member = await group_membership_check(group_id=group_id, db=db, user=user)
    if not is_group_member:
        logger.error("User %s not in group %s", user.username, group_id)
        return await websocket.close(reason="You're not allowed", code=4403)

    user.websocket = websocket
    await websocket.accept()
    logger.info("User %s connected to group %s", user.username, group_id)

    while True:
        try:
            data = await websocket.receive_text()
        except WebSocketDisconnect as e:
            logger.info("User %s disconnected from group %s: %s", user.username, group_id, e)
            break

        if data is None:
            break

        message = await create_message_controller(db=db, user=user, group_id=group_id, text=data)
        from_lang = user.language or "en"

        asyncio.create_task(broadcast_message(group_id, message, db))
        asyncio.create_task(translate_text_background(message, from_lang, db))


async def broadcast_message(group_id: int, message: Message, db) -> None:
    group = await get_group_by_id(db=db, group_id=group_id)
    if group:
        for member in group.members:
            await create_unread_message_controller(
                db=db, message=message, user=member.user, group_id=group_id
            )
            if member.user.websocket:
                asyncio.create_task(member.user.websocket.send_text(message.text))


@app.websocket("/get-unread-messages")
async def send_unread_messages_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    token = websocket.query_params.get("token")
    group_id = websocket.query_params.get("group_id")
    if token and group_id:
        user = await get_current_user(user_db=db, token=token)
        group_id = int(group_id)
    else:
        return await websocket.close(reason="You're not allowed", code=4403)

    is_group_member = await group_membership_check(group_id=group_id, db=db, user=user)
    if not is_group_member:
        return await websocket.close(reason="You're not allowed", code=4403)

    if user.id in websocket_connections:
        logger.error("User %s has more than one websocket for group %s", user.username, group_id)
        return await websocket.close(reason="You're not allowed", code=4403)

    websocket_connections[user.id] = websocket
    await websocket.accept()
    try:
        await send_unread_messages(websocket, user, group_id, db)
    except (WebSocketDisconnect, RuntimeError):
        pass


async def send_unread_messages(websocket: WebSocket, user: User, group_id: int, db: Session):
    while True:
        db.refresh(user)
        all_unread_messages = user.unread_messages or []
        unread_messages_group = [
            um for um in all_unread_messages if str(um.group_id) == str(group_id)
        ]
        if unread_messages_group:
            await send_messages_concurrently(websocket, unread_messages_group)
            for m in all_unread_messages:
                db.delete(m)
            db.commit()
        else:
            try:
                await asyncio.wait_for(websocket.receive(), timeout=0.7)
                continue
            except asyncio.TimeoutError:
                continue
            except (WebSocketDisconnect, RuntimeError):
                if websocket_connections.get(user.id):
                    websocket_connections.pop(user.id)
                break


async def send_messages_concurrently(websocket: WebSocket, messages: list[models.UnreadMessage]):
    tasks = [
        websocket.send_text(
            json.dumps({
                "text": msg.message.text,
                "sender_name": msg.message.sender_name,
                "id": msg.message.id,
                "type": "Text",
                "datetime": str(msg.message.created_at),
            })
        )
        for msg in messages
    ]
    await asyncio.gather(*tasks)


async def broadcast_changes(
    group_id: int,
    change_type: models.ChangeType,
    db: Session,
    message_id: int | None = None,
    new_text: str | None = None,
) -> None:
    group = await get_group_by_id(db=db, group_id=group_id)
    if group:
        changed_value = {
            "type": change_type,
            "id": message_id,
            "new_text": new_text,
        }
        online_users = set(websocket_connections.keys())
        await asyncio.gather(*[
            send_change_to_user(member.user.id, changed_value, online_users)
            for member in group.members
        ])


async def broadcast_changes2(
    group_id: int,
    change_type: models.ChangeType,
    db: Session,
    text_fr: str,
    text_vn: str,
    text_en: str,
    message_id: int | None = None,
) -> None:
    group = await get_group_by_id(db=db, group_id=group_id)
    if group:
        changed_value = {
            "type": change_type,
            "id": message_id,
            "text_fr": text_fr,
            "text_vn": text_vn,
            "text_en": text_en,
        }
        online_users = set(websocket_connections.keys())
        await asyncio.gather(*[
            send_change_to_user(member.user.id, changed_value, online_users)
            for member in group.members
        ])


async def send_change_to_user(user_id: int, change_data: dict, online_users: set) -> None:
    if user_id in online_users:
        connection = websocket_connections[user_id]
        await connection.send_text(json.dumps(change_data))


async def translate_text_background(message: Message, from_lang: str, db: Session) -> None:
    # Gọi 3 task dịch song song
    fr_task = asyncio.create_task(translate(message.text, from_lang, "fr"))
    en_task = asyncio.create_task(translate(message.text, from_lang, "en"))
    vn_task = asyncio.create_task(translate(message.text, from_lang, "vn"))

    fr, en, vn = await asyncio.gather(fr_task, en_task, vn_task)

    db.query(Message).filter_by(id=message.id).update({
        Message.text_fr: fr,
        Message.text_en: en,
        Message.text_vn: vn,
    })
    db.commit()

    await broadcast_changes2(
        group_id=message.group_id,
        change_type="Translate",
        db=db,
        text_en=en,
        text_fr=fr,
        text_vn=vn,
        message_id=message.id,
    )


async def translate(message: str, from_lang: str, to_lang: str) -> str:
    logger.info("Start dịch")
    client = OpenAI(
        base_url="https://a1e5f582a24a.ngrok-free.app/v1",
        api_key="test"
    )

    if from_lang == 'vn':
        from_lang = 'vi'

    SYSTEM_PROMPT = """
    # Role and Task
    You are a fluent, real-time translator for live chat messages. Your task is to translate from {input_language} to {output_language} in a way that sounds natural and conversational, like messages between friends.

    # Instructions:
    - Translate the input fully and accurately into {output_language}.
    - Preserve tone, intent, and emotion (e.g. excitement, frustration).
    - Keep translations short and fluent — not overly literal.
    - You may adapt cultural expressions to make them feel natural in {output_language}.
    - Use casual, spoken phrasing where appropriate.
    - Do not add extra explanations or notes — just translate the message.
    - Format the response as plain text only (no quotes, no brackets, no tags).

    Respond with the chat-style translation in {output_language}.
    """

    chat_messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(
                input_language=from_lang,
                output_language=to_lang
            )
        },
        {
            "role": "user",
            "content": message
        }
    ]

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        functools.partial(
            client.chat.completions.create,
            model="vcmt794/MLBTL_merged",
            messages=chat_messages,
            max_tokens=int(len(chat_messages[1]['content'].split())*4 + 30),
        )
    )
    logger.info(response.choices[0].message.content.replace('<|im_end|>', '').replace('<|im_start|>', '').strip())
    return response.choices[0].message.content.replace('<|im_end|>', '').replace('<|im_start|>', '').strip()

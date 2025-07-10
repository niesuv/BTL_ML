export interface Message {
  id: number;
  username?: string;
  message_text?: string;
  text?: string;
  datetime: string;
  sender_name?: string;
  text_fr?: string;
  text_en?: string;
  text_vn?: string;
}
interface Props {
  msg: Message;
  username: string;
  isUnread: boolean;
  onDelete: (id: number) => void;
  onEdit: (msg: Message) => void;
  userLang: string;
}

export default function MessageBubble({
  msg,
  username,
  isUnread,
  onDelete,
  onEdit,
  userLang,
}: Props) {
  const isMe = msg.username === username || msg.sender_name === username;
  const displayName = msg.username || msg.sender_name || "Unknown";
  const content = msg.message_text ?? msg.text ?? "";
  const time = new Date(msg.datetime + "Z").toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  let translation: string | undefined;

  switch (userLang) {
    case "fr":
      translation = msg.text_fr;
      break;
    case "en":
      translation = msg.text_en;
      break;
    case "vi":
    case "vn":
      translation = msg.text_vn;
      break;
  }

  return (
    <div
      id={`msg-${msg.id}`}
      className={`flex items-end space-x-3 group ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      {!isMe && (
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold shadow">
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{displayName}</div>
        </div>
      )}

      <div
        className={`relative max-w-[70%] px-4 py-2 rounded-2xl shadow-md transition-all duration-200 ${
          isMe
            ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
            : "bg-white text-gray-800 border"
        }`}
      >
        {isUnread && (
          <div className="absolute top-[-1.8rem] left-0 right-0 text-center text-xs text-indigo-500 font-bold">
            Unread messages 👇
          </div>
        )}
        <div className="text-sm leading-snug break-words">{content}</div>
        <div
          className={`text-[10px] text-right mt-1 ${
            isMe ? "text-white/70" : "text-gray-500"
          }`}
        >
          {time}
        </div>

        {!isMe && (
          <div className="mt-2 text-xs text-gray-500 italic">
            {translation ? `Bản dịch: ${translation}` : "Đang dịch..."}
          </div>
        )}

        {isMe && (
          <div className="absolute -right-10 top-2 hidden group-hover:flex flex-col space-y-1">
            <button
              onClick={() => onEdit(msg)}
              className="text-xs text-blue-300 hover:text-white"
              title="Edit"
            >
              ✏
            </button>
            <button
              onClick={() => onDelete(msg.id)}
              className="text-xs text-red-300 hover:text-white"
              title="Delete"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {isMe && (
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-semibold shadow">
            Me
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{displayName}</div>
        </div>
      )}
    </div>
  );
}

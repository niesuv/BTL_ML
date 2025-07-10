const emojis = [
  "⭐",
  "🎉",
  "🎆",
  "💪",
  "❄️",
  "🎈",
  "❤️",
  "✨",
  "🖼️",
  "💎",
  "📞",
  "☔",
  "🍎",
  "😀",
  "🤣",
  "😎",
  "🤑",
  "😇",
  "🤡",
  "👻",
  "💩",
  "🐒",
  "🐞",
  "🦴",
  "🫅",
  "🥝",
  "🍉",
  "🌵",
  "🚗",
  "🚢",
  "🌏",
  "🎸",
  "🗿",
  "⌛",
  "🍕",
  "☘️",
  "🦆",
  "🏦",
  "💃",
];

export interface Group {
  id: string;
  name: string;
  address: string;
  notfound?: boolean;
}
interface Props {
  groups: Group[];
  onSelect: (group: Group) => void;
}

export default function GroupList({ groups, onSelect }: Props) {
  return (
    <ol className="bg-white rounded shadow divide-y">
      {groups.map((group, index) => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];

        return (
          <li
            key={group.id || index}
            onClick={() => onSelect(group)}
            className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 ${
              group.notfound ? "text-gray-400 cursor-default" : ""
            }`}
          >
            <div>
              <div className="font-semibold text-lg">{group.name}</div>
              {!group.notfound && (
                <div className="text-sm text-gray-500">@{group.address}</div>
              )}
            </div>
            <div className="text-xl">{emoji}</div>
          </li>
        );
      })}
    </ol>
  );
}

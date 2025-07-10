interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function EditPopup({
  text,
  onTextChange,
  onCancel,
  onSave,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Edit Message</h2>
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

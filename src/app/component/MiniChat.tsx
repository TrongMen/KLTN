import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react'; // import picker
import { Smile } from 'lucide-react'; // dùng icon dễ thương

export default function MiniChatBox({ conversation, onClose }) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      // TODO: Gửi tin nhắn qua socket hoặc API
      console.log('Send:', message);
      setMessage('');
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="fixed bottom-4 right-4 w-100 bg-white rounded-2xl shadow-lg p-4 z-50 border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Chat với {conversation?.name}</h3>
        <button
        className=" px-2 cursor-pointer py-1 bg-red-500 hover:bg-red-700 text-white rounded-lg transition"
        onClick={onClose}>✖</button>
      </div>

      <div className="flex flex-col space-y-2">
        {/* Vùng hiển thị tin nhắn (placeholder) */}
        <div className="h-48 bg-gray-100 rounded-md p-2 overflow-y-auto text-sm">
          <p className="text-gray-400">Tin nhắn sẽ hiển thị ở đây...</p>
        </div>

        {/* Emoji picker toggle */}
        <div className="relative">
          

          {/* Input + nút gửi */}
          <div className="flex items-center pl-1/2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Nhập tin nhắn..."
            />
            <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className=" cursor-pointer  px-1 text-gray-500"
          >
            <Smile />
          </button>
          
            <button
              onClick={handleSend}
              className="ml-2 px-4 py-2 bg-blue-500 text-white cursor-pointer rounded-lg hover:bg-blue-600"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
      {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
    </div>
  );
}

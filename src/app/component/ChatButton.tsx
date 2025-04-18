"use client";

import React, { useState } from "react";
import ModalChat from "./ModalChat";

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          💬
        </button>
      </div>
      {open && <ModalChat onClose={() => setOpen(false)} />}
    </>
  );
}

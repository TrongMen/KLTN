"use client";

import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
// import Placeholder from '@tiptap/extension-placeholder';
import MenuBar from './MenuBar';

interface MyTiptapEditorProps {
  initialContent?: string;
  onContentChange: (htmlContent: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MyTiptapEditor: React.FC<MyTiptapEditorProps> = ({
  initialContent = '',
  onContentChange,
  disabled = false,
  placeholder = "Nhập nội dung ở đây...",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      TextStyle.configure({}),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Underline,
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      // Placeholder.configure({ placeholder }),
    ],
    content: initialContent, // Dùng cho lần khởi tạo đầu tiên của instance editor này
    onUpdate: ({ editor: updatedEditor }: { editor: Editor }) => {
      let html = updatedEditor.getHTML();
      if (html === '<p></p>' && !updatedEditor.state.doc.textContent) {
        html = '';
      }
      onContentChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none p-4 focus:outline-none min-h-[250px] w-full tiptap-custom-placeholder',
        'data-placeholder': placeholder,
      },
    },
    editable: !disabled,
  }, [disabled, placeholder]); // 'initialContent' đã được loại bỏ khỏi đây để sửa lỗi nhập liệu

  // useEffect này đảm bảo editor được cập nhật khi prop initialContent thay đổi.
  // Điều này quan trọng khi CreateNewsModal truyền một initialData mới (và do đó initialContent mới)
  // và MyTiptapEditor được re-mount (do key thay đổi) hoặc nếu key không thay đổi nhưng initialContent thay đổi.
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentEditorHTML = editor.getHTML();
      // Chỉ gọi setContent nếu nội dung prop thực sự khác với nội dung hiện tại của editor
      // để tránh các vòng lặp không cần thiết hoặc ghi đè lên input của người dùng.
      if (currentEditorHTML !== initialContent) {
        // console.log("MyTiptapEditor: initialContent prop changed. Updating editor content.");
        // console.log("Current editor HTML:", currentEditorHTML);
        // console.log("New initialContent prop:", initialContent);
        editor.commands.setContent(initialContent, false); // 'false' để không trigger onUpdate
      }
    }
  }, [initialContent, editor]); // Chạy khi initialContent hoặc editor instance thay đổi

  useEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-editor-wrapper border border-gray-300 rounded-md overflow-hidden ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
      <MenuBar editor={editor} disabled={disabled} />
      <div className={disabled ? 'opacity-70 cursor-not-allowed' : ''}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default MyTiptapEditor;
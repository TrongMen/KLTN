import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import MenuBar from './MenuBar';

interface MyTiptapEditorProps {
  initialContent?: string;
  onContentChange: (htmlContent: string) => void;
  disabled?: boolean;
}

const MyTiptapEditor: React.FC<MyTiptapEditorProps> = ({
  initialContent = '<p></p>',
  onContentChange,
  disabled = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      TextStyle.configure({}),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor: updatedEditor }: { editor: Editor }) => {
      const html = updatedEditor.getHTML();
      if (onContentChange) {
        onContentChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none p-4 focus:outline-none min-h-[250px] w-full',
      },
    },
    editable: !disabled,
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

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
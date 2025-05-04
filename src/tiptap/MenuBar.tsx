import React, { useCallback } from 'react';
import { Editor } from '@tiptap/react';

interface MenuBarProps {
    editor: Editor | null;
    disabled?: boolean;
}

const FONT_FAMILIES = [
    { label: 'Mặc định', value: '' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Impact', value: 'Impact, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const FONT_SIZES = [
    { label: 'Mặc định', value: '' },
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '24px', value: '24px' },
    { label: '30px', value: '30px' },
    { label: '36px', value: '36px' },
];


const MenuBar: React.FC<MenuBarProps> = ({ editor, disabled = false }) => {
    if (!editor) {
        return null;
    }

    const MenuButton: React.FC<{
        onClick: () => void;
        isDisabled: boolean;
        isActive?: boolean;
        title: string;
        style?: React.CSSProperties;
        children?: React.ReactNode;
    }> = ({ onClick, isDisabled, isActive = false, title, style = {}, children }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`p-1 px-2 m-0.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 ${isActive ? 'bg-gray-200 ring-1 ring-inset ring-gray-400' : 'bg-white'}`}
            style={style}
            title={title}
        >
            {children || title}
        </button>
    );

    const handleFontFamilyChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        if (value) {
            editor.chain().focus().setFontFamily(value).run();
        } else {
            editor.chain().focus().unsetFontFamily().run();
        }
    }, [editor]);

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
         if (value) {
             editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
         } else {
              editor.chain().focus().unsetMark('textStyle').run();
         }
    }, [editor]);

    const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
    const currentFontSize = editor.getAttributes('textStyle').fontSize || '';


    return (
        <div className="menu-bar flex flex-wrap items-center gap-1 p-1 border-b border-gray-300 bg-gray-50 rounded-t-md">
            <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isDisabled={!editor.can().chain().focus().toggleBold().run() || disabled} isActive={editor.isActive('bold')} title="Bold" style={{ fontWeight: 'bold' }}>B</MenuButton>
            <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isDisabled={!editor.can().chain().focus().toggleItalic().run() || disabled} isActive={editor.isActive('italic')} title="Italic" style={{ fontStyle: 'italic' }}>I</MenuButton>
            <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isDisabled={!editor.can().chain().focus().toggleUnderline().run() || disabled} isActive={editor.isActive('underline')} title="Underline" style={{ textDecoration: 'underline' }}>U</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isDisabled={!editor.can().chain().focus().toggleStrike().run() || disabled} isActive={editor.isActive('strike')} title="Strike" style={{ textDecoration: 'line-through' }}>S</MenuButton>

             <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>

             <select
                 value={currentFontFamily}
                 onChange={handleFontFamilyChange}
                 disabled={disabled}
                 className="p-1 m-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white hover:bg-gray-50"
                 title="Font Family"
             >
                 {FONT_FAMILIES.map(font => (
                     <option key={font.label} value={font.value} style={{ fontFamily: font.value || 'inherit' }}>
                         {font.label}
                     </option>
                 ))}
             </select>

             <select
                 value={currentFontSize}
                 onChange={handleFontSizeChange}
                 disabled={disabled}
                 className="p-1 m-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white hover:bg-gray-50"
                 title="Font Size"
            >
                 {FONT_SIZES.map(size => (
                     <option key={size.label} value={size.value}>
                         {size.label}
                     </option>
                 ))}
             </select>

             <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>

             <MenuButton onClick={() => editor.chain().focus().setParagraph().run()} isDisabled={disabled} isActive={editor.isActive('paragraph')} title="Paragraph">P</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isDisabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run() || disabled} isActive={editor.isActive('heading', { level: 1 })} title="H1">H1</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isDisabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run() || disabled} isActive={editor.isActive('heading', { level: 2 })} title="H2">H2</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isDisabled={!editor.can().chain().focus().toggleBulletList().run() || disabled} isActive={editor.isActive('bulletList')} title="Bullet List">UL</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isDisabled={!editor.can().chain().focus().toggleOrderedList().run() || disabled} isActive={editor.isActive('orderedList')} title="Ordered List">OL</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isDisabled={!editor.can().chain().focus().toggleBlockquote().run() || disabled} isActive={editor.isActive('blockquote')} title="Blockquote">"</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} isDisabled={disabled} title="Horizontal Rule">—</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().undo().run()} isDisabled={!editor.can().chain().focus().undo().run() || disabled} title="Undo">↶</MenuButton>
             <MenuButton onClick={() => editor.chain().focus().redo().run()} isDisabled={!editor.can().chain().focus().redo().run() || disabled} title="Redo">↷</MenuButton>
        </div>
    );
};

export default MenuBar;
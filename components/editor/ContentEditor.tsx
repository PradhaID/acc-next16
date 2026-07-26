'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

import { common, createLowlight } from 'lowlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
    BoldIcon,
    ItalicIcon,
    StrikethroughIcon,
    ListBulletIcon,
    Bars3BottomLeftIcon,
    PhotoIcon,
    LinkIcon,
    CodeBracketIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';
import MediaPickerModal from './MediaPickerModal';

const lowlight = createLowlight(common);

interface Props {
    value: string;
    onChange: (val: string) => void;
}

function Toolbar({ editor }: { editor: any }) {
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

    const handleSelectFromLibrary = (url: string) => {
        editor.chain().focus().setImage({ src: url }).run();
        setIsMediaModalOpen(false);
    };

    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            // 1. Upload Fisik
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                // 2. Simpan ke Database Media Library agar sinkron
                const mediaPayload = {
                    name: file.name,
                    path: uploadData.url,
                    mimeType: file.type,
                    extension: file.name.split('.').pop(),
                    size: uploadData.optimizedSize || file.size,
                };

                await fetch("/api/content/media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mediaPayload),
                });

                // 3. Masukkan ke Editor
                editor.chain().focus().setImage({ src: uploadData.url }).run();
            }
        } catch (error) {
            console.error("Editor Upload Error:", error);
        }
    }, [editor]);

    const addLink = useCallback(() => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
        }
    }, [editor]);

    const buttonClass = (active?: boolean) =>
        `p-2 rounded-lg transition-colors ${active
            ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-300'
            : 'hover:bg-gray-100 dark:hover:bg-stone-700 text-gray-600 dark:text-stone-400'
        }`;

    return (
        <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-stone-700/50 p-3 bg-gray-50 dark:bg-stone-800/40 rounded-t-lg">
            {/* Text Formatting */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={buttonClass(editor.isActive('bold'))}
                title="Bold (Ctrl+B)"
            >
                <BoldIcon className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={buttonClass(editor.isActive('italic'))}
                title="Italic (Ctrl+I)"
            >
                <ItalicIcon className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={buttonClass(editor.isActive('underline'))}
                title="Underline (Ctrl+U)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6v6a5 5 0 0010 0V6M5 20h14" />
                </svg>
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={buttonClass(editor.isActive('strike'))}
                title="Strikethrough"
            >
                <StrikethroughIcon className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Subscript & Superscript */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={buttonClass(editor.isActive('subscript'))}
                title="Subscript"
            >
                <span className="text-sm font-medium">X₂</span>
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={buttonClass(editor.isActive('superscript'))}
                title="Superscript"
            >
                <span className="text-sm font-medium">X²</span>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Headings */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={buttonClass(editor.isActive('heading', { level: 2 }))}
                title="Heading 2"
            >
                <span className="text-sm font-bold">H2</span>
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={buttonClass(editor.isActive('heading', { level: 3 }))}
                title="Heading 3"
            >
                <span className="text-sm font-bold">H3</span>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Lists */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={buttonClass(editor.isActive('bulletList'))}
                title="Bullet List"
            >
                <ListBulletIcon className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={buttonClass(editor.isActive('orderedList'))}
                title="Numbered List"
            >
                <Bars3BottomLeftIcon className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Code */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={buttonClass(editor.isActive('code'))}
                title="Inline Code"
            >
                <CodeBracketIcon className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={buttonClass(editor.isActive('codeBlock'))}
                title="Code Block"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Link */}
            <button
                type="button"
                onClick={addLink}
                className={buttonClass(editor.isActive('link'))}
                title="Insert Link"
            >
                <LinkIcon className="w-5 h-5" />
            </button>

            <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)} // Buka Modal Library
                className={buttonClass()}
                title="Insert Image from Library"
            >
                <PhotoIcon className="w-5 h-5" />
            </button>
            {/* Sisipkan Modal Picker */}
            <MediaPickerModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                onSelect={handleSelectFromLibrary}
            />

            {/* Alignment */}
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={buttonClass(editor.isActive({ textAlign: 'left' }))}
                title="Align Left"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                </svg>
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={buttonClass(editor.isActive({ textAlign: 'center' }))}
                title="Align Center"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                </svg>
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={buttonClass(editor.isActive({ textAlign: 'right' }))}
                title="Align Right"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                </svg>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-stone-600 mx-1" />

            {/* Table Controls */}
            <button
                type="button"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className={buttonClass()}
                title="Insert Table"
            >
                <TableCellsIcon className="w-5 h-5" />
            </button>

            {editor.isActive('table') && (
                <>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        className={buttonClass()}
                        title="Add Column After"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        className={buttonClass()}
                        title="Add Row After"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        className="p-2 rounded-lg transition-colors hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30"
                        title="Delete Table"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}

export default function ContentEditor({ value, onChange }: Props) {
    const isEditorChange = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Underline,
            Subscript,
            Superscript,
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg my-4',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-orange-600 dark:text-orange-400 underline hover:text-orange-900 dark:hover:text-orange-300',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            Placeholder.configure({
                placeholder: 'Write your content here...',
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: value,
        immediatelyRender: false,
        onUpdate({ editor }) {
            isEditorChange.current = true;
            onChange(editor.getHTML());
        },
    });

    // Sync external value changes (e.g. async-loaded post content) into the editor.
    // Skip when the change originated from the editor itself to avoid feedback loops.
    useEffect(() => {
        if (!editor) return;
        if (isEditorChange.current) {
            isEditorChange.current = false;
            return;
        }
        const current = editor.getHTML();
        if (value !== current) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div
            className="
                border border-gray-300 dark:border-stone-700/50 rounded-lg 
                bg-white dark:bg-stone-800/40
                focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500
                transition-all
            "
        >
            <Toolbar editor={editor} />

            <div
                onClick={() => editor.chain().focus().run()}
                className="cursor-text"
            >
                <EditorContent
                    editor={editor}
                    className="p-4 min-h-[400px] prose prose-sm dark:prose-invert max-w-none
                        prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl
                        prose-p:text-gray-900 dark:prose-p:text-gray-100
                        prose-ul:list-disc prose-ul:pl-6
                        prose-ol:list-decimal prose-ol:pl-6
                        prose-li:text-gray-900 dark:prose-li:text-gray-100
                        prose-code:bg-gray-100 dark:prose-code:bg-gray-800 
                        prose-code:text-pink-600 dark:prose-code:text-pink-400
                        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
                        prose-pre:text-gray-100
                        [&_.ProseMirror]:outline-none
                        [&_.ProseMirror]:border-none
                        [&_.ProseMirror]:focus:outline-none
                        [&_.ProseMirror]:focus:ring-0
                        [&_.ProseMirror_ul]:list-disc
                        [&_.ProseMirror_ul]:pl-6
                        [&_.ProseMirror_ol]:list-decimal
                        [&_.ProseMirror_ol]:pl-6
                        [&_.ProseMirror_table]:border-collapse
                        [&_.ProseMirror_table]:table-fixed
                        [&_.ProseMirror_table]:w-full
                        [&_.ProseMirror_table]:my-4
                        [&_.ProseMirror_td]:border
                        [&_.ProseMirror_td]:border-gray-300
                        [&_.ProseMirror_td]:dark:border-stone-600
                        [&_.ProseMirror_td]:p-2
                        [&_.ProseMirror_td]:relative
                        [&_.ProseMirror_th]:border
                        [&_.ProseMirror_th]:border-gray-300
                        [&_.ProseMirror_th]:dark:border-stone-600
                        [&_.ProseMirror_th]:p-2
                        [&_.ProseMirror_th]:bg-gray-100
                        [&_.ProseMirror_th]:dark:bg-stone-700
                        [&_.ProseMirror_th]:font-bold
                        [&_.ProseMirror_th]:text-left
                        [&_.ProseMirror_.selectedCell]:bg-orange-50
                        [&_.ProseMirror_.selectedCell]:dark:bg-orange-950/30
                        [&_.ProseMirror_.selectedCell]:border-orange-500
                    "
                />
            </div>
        </div>
    );
}
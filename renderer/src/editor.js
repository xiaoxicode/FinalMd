import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Placeholder, CharacterCount } from '@tiptap/extensions';

/** File -> dataURL */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

const isImageFile = (f) => f && /^image\//.test(f.type);

export function createEditor({ element, onUpdate, onSelectionUpdate, onDropImage }) {
  const editor = new Editor({
    element,
    autofocus: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
        codeBlock: { HTMLAttributes: { spellcheck: 'false' } },
        horizontalRule: {},
      }),
      Markdown.configure({
        html: true, // 颜色、高亮、下划线等用 HTML 标签保留
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,
        breaks: false,
        transformPastedText: false,
        transformCopiedText: false,
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TableKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit,
      Placeholder.configure({
        placeholder: '开始写作…  输入 "# " 变标题，"- " 变列表，"> " 变引用',
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
      }),
      CharacterCount.configure({ limit: null }),
    ],
    editorProps: {
      attributes: {
        class: 'mw-editor',
        spellcheck: 'true',
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files || []);
        const images = files.filter(isImageFile);
        if (!images.length) return false;
        event.preventDefault();
        onDropImage?.(images);
        return true;
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []);
        const images = files.filter(isImageFile);
        if (!images.length) return false;
        event.preventDefault();
        onDropImage?.(images);
        return true;
      },
    },
    onUpdate,
    onSelectionUpdate,
  });

  return editor;
}

/** 文档 -> Markdown 字符串 */
export function toMarkdown(editor) {
  return editor.storage.markdown.getMarkdown();
}

/** Markdown 字符串 -> 文档 */
export function fromMarkdown(editor, markdown) {
  editor.commands.setContent(markdown ?? '');
}

/** 统计信息 */
export function stats(editor) {
  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();
  const text = editor.getText();
  const lines = text ? text.split('\n').length : 1;
  return { words, chars, lines };
}

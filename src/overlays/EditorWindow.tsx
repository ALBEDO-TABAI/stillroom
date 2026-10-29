import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useStore } from '../store/store';
import { Icon } from '../lib/icons';
import { btn } from '../lib/button';
import { useEscape, usePresence } from '../lib/motion';

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
/** The document's first block is the title. */
function split(html: string) {
  const d = document.createElement('div'); d.innerHTML = html;
  const first = d.firstElementChild;
  const title = first ? (first.textContent ?? '') : '';
  const align = (first as HTMLElement | null)?.style?.textAlign as any;
  first?.remove();
  const text = d.innerHTML.replace(/^(<p><\/p>)+$/, '');
  return { title, text, align: align || undefined };
}

export function EditorWindow() {
  const id = useStore(s => s.ui.editorId);
  const { rendered, closing } = usePresence(!!id);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => { if (id) setLast(id); }, [id]);
  if (!rendered || !last) return null;
  return <Win key={last} id={last} closing={closing} />;
}

function Win({ id, closing }: { id: string; closing: boolean }) {
  const note = useStore(s => s.notes[id]);
  const update = useStore(s => s.update);
  const setUI = useStore(s => s.setUI);
  const [full, setFull] = useState(false);
  const [side, setSide] = useState<'center' | 'right'>('center');
  const [more, setMore] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => { const el = winRef.current; if (!el) return; const ro = new ResizeObserver(() => setH(el.offsetHeight)); ro.observe(el); setH(el.offsetHeight); return () => ro.disconnect(); }, []);
  const initial = useMemo(() => {
    const a = note?.metadata.titleAlign; const style = a && a !== 'left' ? ` style="text-align: ${a}"` : '';
    const body = !note?.text ? '<p></p>' : note.text.startsWith('<') ? note.text : `<p>${esc(note.text)}</p>`;
    return `<h1${style}>${esc(note?.title ?? '')}</h1>${body}`;
  }, [id]); // eslint-disable-line
  const close = () => setUI({ editorId: null });
  useEscape(() => (more ? setMore(false) : close()), !closing);
  const edited = useRef(false);
  useEffect(() => { edited.current = false; }, [id]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList, TaskItem.configure({ nested: true }), Highlight,
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === 'heading' ? 'Title' : 'Write…') }),
    ],
    content: initial,
    autofocus: 'end',
    editorProps: { attributes: { class: 'sr-editor sr-doc sr-prose', spellcheck: 'true' } },
    onUpdate: ({ editor }) => {
      if (!edited.current) { edited.current = true; useStore.getState().checkpoint(); } // one undo step per editing session
      const { title, text, align } = split(editor.getHTML());
      update(id, { title, text, metadata: { titleAlign: align ?? note?.metadata.titleAlign } });
    },
  });
  if (!note) return null;
  const e = editor;
  const level = e?.isActive('heading', { level: 1 }) ? 'H1' : e?.isActive('heading', { level: 2 }) ? 'H2' : e?.isActive('heading', { level: 3 }) ? 'H3' : 'T';
  const cycleLevel = () => {
    if (!e) return; const c = e.chain().focus();
    if (level === 'T') c.toggleHeading({ level: 1 }).run(); else if (level === 'H1') c.toggleHeading({ level: 2 }).run(); else if (level === 'H2') c.toggleHeading({ level: 3 }).run(); else c.setParagraph().run();
  };
  const cycleList = () => {
    if (!e) return; const c = e.chain().focus();
    if (e.isActive('bulletList')) c.toggleOrderedList().run(); else if (e.isActive('orderedList')) c.toggleTaskList().run(); else if (e.isActive('taskList')) c.toggleTaskList().run(); else c.toggleBulletList().run();
  };
  const weights = ['light', 'regular', 'medium'] as const;
  const wi = weights.indexOf((note.metadata.titleWeight as any) ?? 'regular');
  const align = (['left', 'center', 'right'] as const).find(a => e?.isActive({ textAlign: a })) ?? 'left';
  const nextAlign = align === 'left' ? 'center' : align === 'center' ? 'right' : 'left';
  const pos: React.CSSProperties = side === 'right' && !full ? { left: 'max(14px, 50vw)', right: 14 } : {};
  const listed = e?.isActive('bulletList') || e?.isActive('orderedList') || e?.isActive('taskList');

  return (
    <>
      <div ref={winRef} className={'sr-editor-window' + (closing ? ' sr-out' : '')} data-full={full ? 'true' : undefined} style={{ ...pos, ['--sr-title-weight' as any]: 400 }}>
        <div className="sr-win-scroll"><div className="sr-win-col"><EditorContent editor={editor} /></div></div>
      </div>
      <div className="sr-win-chrome" data-full={full ? 'true' : undefined} style={{ ...pos, height: h, opacity: closing ? 0 : 1, transition: 'opacity var(--sr-exit)' }}>
        <div className="sr-win-row">
          <button title={side === 'right' ? 'Move to centre' : 'Move to right'} className={btn({ icon: true })} onClick={() => setSide(side === 'right' ? 'center' : 'right')}><Icon name="panel" /></button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="sr-fmt sr-in sr-in--chrome">
              <button type="button" title="Text level" onClick={cycleLevel}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em' }}>{level === 'T' ? 'T' : <>H<span style={{ fontSize: 11 }}>{level[1]}</span></>}</span>
              </button>
              <button type="button" title="Block" data-dim={listed ? undefined : 'true'} onClick={cycleList}><Icon name="list" /></button>
              <button type="button" title={weights[wi][0].toUpperCase() + weights[wi].slice(1)} onClick={() => update(id, { metadata: { titleWeight: weights[(wi + 1) % 3] } })}>
                <span style={{ fontWeight: [300, 400, 500][wi], fontSize: 16 }}>A</span>
              </button>
              <button type="button" title={`Align ${align}`} onClick={() => e?.chain().focus().setTextAlign(nextAlign).run()}>
                <Icon name={align === 'left' ? 'align' : align === 'center' ? 'alignCenter' : 'alignRight'} />
              </button>
              <button type="button" title="More" className={more ? 'is-on' : ''} onClick={() => setMore(!more)}><Icon name="more" /></button>
              {more && e && (
                <div className="sr-fmt-pop sr-in" style={{ ['--sr-in-t' as any]: '0 -6px' }}>
                  <button className={e.isActive('bold') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleBold().run()}><b>B</b></button>
                  <button className={e.isActive('italic') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleItalic().run()}><i>I</i></button>
                  <button className={e.isActive('strike') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleStrike().run()}><s>S</s></button>
                  <button className={e.isActive('highlight') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleHighlight().run()}>Mark</button>
                  <button className={e.isActive('blockquote') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleBlockquote().run()}>Quote</button>
                  <button className={e.isActive('codeBlock') ? 'is-on' : ''} onClick={() => e.chain().focus().toggleCodeBlock().run()}>Code</button>
                  <button onClick={() => e.chain().focus().setHorizontalRule().run()}>Divider</button>
                </div>
              )}
            </div>
          </div>
          <button title="Close (Esc)" className={btn({ icon: true })} onClick={close}><Icon name="close" /></button>
        </div>
        <button title={full ? 'Back to window' : 'Unpack onto the canvas'} className={btn({ icon: true }) + ' sr-win-unpack'}
          onClick={() => { if (full) setFull(false); else { update(id, { metadata: { packed: false } }); close(); } }}
          onContextMenu={ev => { ev.preventDefault(); setFull(!full); }}>
          <Icon name={full ? 'collapse' : 'expand'} />
        </button>
      </div>
    </>
  );
}

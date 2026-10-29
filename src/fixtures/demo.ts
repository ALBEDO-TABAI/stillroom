// Synthetic parity fixture. Same arrangement as the reference guest canvas (16 modules), our own name and
// our own generated pictures (public/fixtures, made with Grok Imagine). No real user data.
import type { Note } from '../store/types';

const T0 = Date.now();
const base = (id: string, type: Note['type'], x: number, y: number, rest: Partial<Note> = {}): Note => ({
  id, type, title: '', text: '', createdAt: T0, updatedAt: T0, canvasX: x, canvasY: y, parentId: null, deletedAt: null, metadata: {}, ...rest,
});

export function demoNotes(): Note[] {
  return [
    base('901', 'text', -122, -146, { title: 'Welcome to Stillroom.', metadata: { dock: null, packed: false, titleAlign: 'center', titleWeight: 'medium', displayWidth: 384, titleFontScale: 3.1964918873059482 } }),
    base('902', 'text', -60, 38, { title: 'A quiet space for visual thinking.', metadata: { dock: { t: '901' }, packed: false, titleAlign: 'center', titleWeight: 'medium', displayWidth: 260, titleFontScale: 1.291834453905744 } }),
    base('916', 'text', 503, -224, { title: 'No AI to babysit.', metadata: { frameH: 67, titleAlign: 'center', titleWeight: 'medium', displayWidth: 260, titleFontScale: 1.5129932644092012 } }),
    base('917', 'text', -838, -835, { title: "You don't need a second brain. Use your first.", metadata: { dock: null, frameH: 99, titleAlign: 'center', titleWeight: 'medium', displayWidth: 463, titleFontScale: 1.5162 } }),
    base('911', 'text', -60, 214, { title: 'Capture ideas in an instant using voice input — just press the orange button below. Edit your text in a full-featured editor.', text: '<p></p>', metadata: { titleAlign: 'center', titleWeight: 'medium', displayWidth: 260, titleFontScale: 1 } }),
    base('912', 'text', -363, -453, { title: 'Bring order', text: '<p>The space helps you do it. Snap a few together to organize them in clusters. Merge ideas into one, or split one into many.</p>', metadata: { dock: { l: '1791479088593649' } } }),
    base('913', 'text', 501, 254, { title: 'Think visually', text: 'Organize your thoughts and ideas into a convenient layout in a single move. Select a few and press L or P to organize, or R if you want more chaos.', metadata: { dock: { t: '1791479134821221' } } }),
    base('914', 'text', -838, -182, { title: "Change the gap between modules, turn off rounded corners on images, toggle features on and off. It's in the user's menu in top left corner.", text: '<p></p>', metadata: { dock: { t: '1791479088593649' }, frameH: 120, titleAlign: 'right', titleWeight: 'medium', displayWidth: 463, titleFontScale: 1.0782 } }),
    base('1783355259111069', 'folder', -516, 62, { title: 'This is the folder, drag something in there', metadata: { dock: { l: '1791479183046823' } } }),
    base('1783357657915456', 'link', 194, -566, { title: 'https://music.youtube.com/playlist?list=stillroom-fixture', metadata: { url: 'https://music.youtube.com/playlist?list=stillroom-fixture', domain: 'music.youtube.com' } }),
    base('923', 'image', -1282, -724, { title: 'wall-glow', mediaUrl: '/fixtures/wall-glow.jpg', metadata: { lightImage: false, aspectRatio: 0.6013, displayWidth: 432, originalFilename: 'wall-glow.jpg' } }),
    base('1791479088593649', 'image', -838, -453, { title: 'seated-light', mediaUrl: '/fixtures/seated-light.jpg', metadata: { dock: { t: '1791479088593069' }, lightImage: false, aspectRatio: 0.5604, displayWidth: 463, originalFilename: 'seated-light.jpg', fileSize: 144850 } }),
    base('1791479088593069', 'image', -838, -724, { title: 'pebble-sand', mediaUrl: '/fixtures/pebble-sand.jpg', metadata: { dock: { l: '923', t: '917' }, lightImage: false, aspectRatio: 0.5604, displayWidth: 463, originalFilename: 'pebble-sand.jpg', fileSize: 183875 } }),
    base('1791479134821221', 'image', 503, -145, { title: 'hand-capsule', mediaUrl: '/fixtures/hand-capsule.jpg', metadata: { dock: { t: '916' }, lightImage: false, aspectRatio: 1.4994, displayWidth: 258, originalFilename: 'hand-capsule.jpg', fileSize: 160769 } }),
    base('1791479183046823', 'image', -701, 62, { title: 'chest-light', mediaUrl: '/fixtures/chest-light.jpg', metadata: { lightImage: false, aspectRatio: 1.4994, displayWidth: 173, originalFilename: 'chest-light.jpg', fileSize: 272658 } }),
    base('1791479194115283', 'image', 773, -145, { title: 'neck-glow', mediaUrl: '/fixtures/neck-glow.jpg', metadata: { dock: { l: '1791479134821221' }, lightImage: false, aspectRatio: 0.6015, displayWidth: 645, originalFilename: 'neck-glow.jpg', fileSize: 138035 } }),
  ];
}

/** First-run canvas: the guided arrangement plus a voice memo and a short clip to try playback. */
export function starterNotes(): Note[] {
  return [
    ...demoNotes(),
    base('s-voice', 'audio', 1430, -145, { title: 'Voice memo — pebble idea', text: '<p>A pebble that breathes light. Soft sand, warm glow, slow pulse.</p>', audioUrl: '/fixtures/idea.mp3', duration: '0:08', metadata: { dock: { l: '1791479194115283' }, transcript: 'A pebble that breathes light. Soft sand, warm glow, slow pulse.' } }),
    base('s-video', 'video', 1430, 80, { title: 'pebble-breath', mediaUrl: '/fixtures/pebble-breath.mp4', duration: '0:05', metadata: { aspectRatio: 400 / 736, displayWidth: 320, poster: '/fixtures/pebble-breath-poster.jpg', originalFilename: 'pebble-breath.mp4' } }),
  ];
}

/** A new account's first canvas (signed-in reference): welcome title, "Where to start" list, an empty folder,
 *  two pictures and a video link with a cover. Same arrangement and sizes as measured; our words and pictures. */
export function accountStarterNotes(): Note[] {
  const where = '<ul><li><p>Press the orange button to record your voice as a transcribed, auto-titled module.</p></li><li><p>Right-click on the canvas to add text modules or folders.</p></li><li><p>Double-click a module to edit.</p></li><li><p>Drop audio files to transcribe them, or images to place on the canvas.</p></li><li><p>Snap modules into clusters and place them in folders.</p></li></ul>';
  return [
    base('a1', 'image', 1854, 521, { title: 'moth-light', mediaUrl: '/fixtures/hand-capsule.jpg', metadata: { aspectRatio: 1, displayWidth: 275, originalFilename: 'moth-light.jpg', fileSize: 160769 } }),
    base('a2', 'folder', 1056, 521, { title: 'Drop here to add to folder', metadata: {} }),
    base('a3', 'text', 1582, 360, { title: 'Welcome to Stillroom', text: '<p></p>', metadata: { packed: false, frameH: 124, titleAlign: 'center', titleWeight: 'medium', displayWidth: 260, titleFontScale: 2.0949 } }),
    base('a4', 'image', 1328, 521, { title: 'hush', mediaUrl: '/fixtures/chest-light.jpg', metadata: { aspectRatio: 324 / 242, displayWidth: 242, originalFilename: 'hush.jpg', fileSize: 272658 } }),
    base('a5', 'text', 1582, 521, { title: 'Where to start', text: where, metadata: { packed: false, titleAlign: 'center', displayWidth: 260 } }),
    base('a6', 'link', 1582, 808, { title: 'https://www.youtube.com/watch?v=stillroom-fixture', metadata: { url: 'https://www.youtube.com/watch?v=stillroom-fixture', domain: 'youtube.com', linkTitle: 'Stillroom - Breathing Room', linkImage: '/fixtures/pebble-breath-poster.jpg' } }),
  ];
}

/** Stress fixture (`?fixture=stress&n=500`): a grid of mixed synthetic modules for perf checks. */
export function stressNotes(n = 500): Note[] {
  const pics = ['/fixtures/wall-glow.jpg', '/fixtures/pebble-sand.jpg', '/fixtures/hand-capsule.jpg', '/fixtures/neck-glow.jpg', '/fixtures/chest-light.jpg', '/fixtures/seated-light.jpg'];
  const words = ['quiet', 'stone', 'light', 'room', 'paper', 'sand', 'glow', 'thread', 'window', 'morning', '光', '石', '静かな', '房间'];
  const out: Note[] = [];
  const cols = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const x = (i % cols) * 290, y = Math.floor(i / cols) * 300;
    const w = (k: number) => Array.from({ length: k }, (_, j) => words[(i * 7 + j * 3) % words.length]).join(' ');
    if (i % 5 === 0) out.push(base(`s${i}`, 'image', x, y, { mediaUrl: pics[i % pics.length], metadata: { aspectRatio: 0.75, displayWidth: 260 } }));
    else if (i % 5 === 1) out.push(base(`s${i}`, 'text', x, y, { title: w(3), text: `<p>${w(18)}</p>`, metadata: { packed: true } }));
    else out.push(base(`s${i}`, 'text', x, y, { title: w(2 + (i % 4)) }));
  }
  return out;
}

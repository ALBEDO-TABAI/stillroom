import { create } from 'zustand';
import { resolveMedia } from './blobs';
import { useStore } from './store';
// One player for the whole canvas: starting a voice module stops the previous one.
const el = typeof Audio !== 'undefined' ? new Audio() : null;
export const useAudio = create<{ id: string | null; playing: boolean; progress: number }>(() => ({ id: null, playing: false, progress: 0 }));
if (el) {
  el.addEventListener('timeupdate', () => useAudio.setState({ progress: el.duration ? el.currentTime / el.duration : 0 }));
  el.addEventListener('ended', () => useAudio.setState({ playing: false, progress: 0 }));
  el.addEventListener('pause', () => useAudio.setState({ playing: false }));
  el.addEventListener('play', () => useAudio.setState({ playing: true }));
}
export async function toggleAudio(id: string, ref?: string) {
  if (!el || !ref) return;
  const st = useAudio.getState();
  if (st.id === id && st.playing) { el.pause(); return; }
  if (st.id !== id) { el.src = (await resolveMedia(ref)) ?? ''; useAudio.setState({ id, progress: 0 }); }
  el.playbackRate = useStore.getState().prefs.playbackSpeed;
  await el.play().catch(() => {});
}

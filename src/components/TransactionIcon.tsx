import type { ItemIconName } from './transactionsView';
const icons = {
  phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></>,
  laptop: <><path d="M5 16V4h14v12M2 16h20l-2 4H4l-2-4Z"/></>,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/></>,
  audio: <><path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H3v-8ZM17 12h4v8h-4v-8Z"/></>,
  console: <><path d="M7 7h10c4 0 7 14 2 13l-4-4H9l-4 4C0 21 3 7 7 7ZM5 11h6M8 8v6M16 11h.1M19 13h.1"/></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6V2h6v4M9 18v4h6v-4M12 9v3l2 1"/></>,
  game: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r=".8"/><circle cx="16" cy="8" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="8" cy="16" r=".8"/><circle cx="16" cy="16" r=".8"/></>,
  lamp: <><path d="m8 3-4 9h16l-4-9H8ZM12 12v9M7 21h10"/></>,
  helmet: <><path d="M3 14v-3a9 9 0 0 1 18 0v3H3ZM3 14l5 7h8l5-7M12 3v6M7 5l2 5M17 5l-2 5"/></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M7 16h10"/></>,
  drone: <><circle cx="5" cy="5" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m7 7 10 10M7 17 17 7"/><rect x="9" y="9" width="6" height="6" rx="1"/></>,
  stove: <><path d="M4 21h16V10H4v11ZM4 15h16M8 6c-2-2 2-2 0-4M12 6c-2-2 2-2 0-4M16 6c-2-2 2-2 0-4M8 18h.1M16 18h.1"/></>,
  package: <><path d="m3 7 9-5 9 5v10l-9 5-9-5V7ZM3 7l9 5 9-5M12 12v10M8 4l9 5"/></>,
};
export function TransactionIcon({ name }: { name: ItemIconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">{icons[name]}</svg>;
}

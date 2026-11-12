import { BookOpen, Image as ImageIcon, PenTool, Sparkles } from 'lucide-react';
import { useUiStore, type SettingsTab } from '@/store/uiStore';
import { useI18n } from '@/i18n';
import { PaperPanel } from './panels/PaperPanel';
import { InkPanel } from './panels/InkPanel';
import { RealismPanel } from './panels/RealismPanel';
import { ImagesPanel } from './panels/ImagesPanel';

const TABS: Array<{ id: SettingsTab; icon: typeof BookOpen; key: 'tabs.paper' | 'tabs.ink' | 'tabs.realism' | 'tabs.images' }> = [
  { id: 'paper', icon: BookOpen, key: 'tabs.paper' },
  { id: 'ink', icon: PenTool, key: 'tabs.ink' },
  { id: 'realism', icon: Sparkles, key: 'tabs.realism' },
  { id: 'images', icon: ImageIcon, key: 'tabs.images' },
];

export function SettingsPanel({ pages }: { pages: number }) {
  const { t } = useI18n();
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden">
      <nav className="grid shrink-0 grid-cols-4 gap-0.5 border-b border-line bg-panel-2/40 p-1.5" aria-label="settings">
        {TABS.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[0.64rem] font-medium transition-colors ${
              tab === id ? 'bg-panel text-ink shadow-[0_1px_2px_rgba(60,42,20,0.12)]' : 'text-muted hover:bg-panel/60'
            }`}
            aria-current={tab === id}
          >
            <Icon size={15} strokeWidth={1.7} className={tab === id ? 'text-accent' : undefined} />
            {t(key)}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'paper' && <PaperPanel />}
        {tab === 'ink' && <InkPanel />}
        {tab === 'realism' && <RealismPanel />}
        {tab === 'images' && <ImagesPanel pages={pages} />}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Image as ImageIcon, PenTool, SlidersHorizontal } from 'lucide-react';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ExportDialog } from './components/ExportDialog';
import { useDocStore } from './store/documentStore';
import { useUiStore } from './store/uiStore';
import { usePages } from './hooks/usePages';
import { importImage } from './lib/importImage';
import { useI18n } from './i18n';

type MobileView = 'text' | 'preview' | 'settings';

export default function App() {
  const { t } = useI18n();
  const doc = useDocStore((s) => s.doc);
  const addImage = useDocStore((s) => s.addImage);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const currentPage = useUiStore((s) => s.currentPage);
  const setCurrentPage = useUiStore((s) => s.setCurrentPage);
  const { pages, layouting, error } = usePages(doc);
  const [mobileView, setMobileView] = useState<MobileView>('preview');

  useEffect(() => {
    if (pages.length && currentPage > pages.length - 1) setCurrentPage(pages.length - 1);
  }, [pages.length, currentPage, setCurrentPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setExportOpen]);

  const handleDropFile = async (file: File, page: number) => {
    const placed = await importImage(file, Math.min(Math.max(0, page), Math.max(0, pages.length - 1)), doc);
    addImage(placed);
    useUiStore.getState().setSelectedImageId(placed.id);
    useUiStore.getState().setTab('images');
  };

  return (
    <div className="flex h-full flex-col">
      <Header layouting={layouting} />

      <main className="flex min-h-0 flex-1 gap-3 p-3 lg:gap-4 lg:p-4">
        <aside
          className={`min-h-0 w-full shrink-0 lg:block lg:w-[320px] xl:w-[350px] ${
            mobileView === 'text' ? 'block' : 'hidden'
          }`}
        >
          <EditorPanel pages={pages.length} />
        </aside>

        <section
          className={`min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-[#e8dfcd]/55 lg:block ${
            mobileView === 'preview' ? 'block' : 'hidden'
          }`}
        >
          <PreviewPanel pages={pages} layouting={layouting} error={error} onDropFile={handleDropFile} />
        </section>

        <aside
          className={`min-h-0 w-full shrink-0 lg:block lg:w-[310px] xl:w-[330px] ${
            mobileView === 'settings' ? 'block' : 'hidden'
          }`}
        >
          <SettingsPanel pages={pages.length} />
        </aside>
      </main>

      <nav className="flex shrink-0 items-center justify-around border-t border-line bg-panel/90 px-2 py-1.5 backdrop-blur lg:hidden">
        {(
          [
            ['text', PenTool, t('editor.title')],
            ['preview', ImageIcon, t('zoom.page')],
            ['settings', SlidersHorizontal, t('tabs.paper')],
          ] as const
        ).map(([view, Icon, label]) => (
          <button
            key={view}
            onClick={() => setMobileView(view)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.62rem] ${
              mobileView === view ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <ExportDialog pages={pages} doc={doc} />
    </div>
  );
}

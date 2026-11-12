import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'es' | 'en';

const es = {
  'app.name': 'Escribano',
  'app.tagline': 'texto que se siente escrito a mano',
  'header.export': 'Exportar',
  'header.new': 'Nuevo',
  'header.saved': 'Guardado automático',
  'header.language': 'Idioma',

  'editor.title': 'Tu texto',
  'editor.placeholder': 'Escribe o pega aquí tu texto…',
  'editor.help': 'Markdown ligero: # título · - lista · $x^2$ · | tabla | · ---page---',
  'editor.bold': 'Negrita',
  'editor.underline': 'Subrayado',
  'editor.math': 'Fórmula',
  'editor.table': 'Tabla',
  'editor.pagebreak': 'Salto de página',
  'editor.sample': 'Ejemplo',
  'editor.clear': 'Vaciar',
  'editor.words': 'palabras',
  'editor.chars': 'caracteres',
  'editor.pages': 'páginas',
  'editor.tip': 'Consejo: escribe una línea en blanco entre párrafos para respirar.',

  'paper.title': 'Papel',
  'paper.template': 'Plantilla',
  'paper.blank': 'Liso',
  'paper.ruled': 'Rayado',
  'paper.graph': 'Cuadriculado',
  'paper.dotted': 'Puntos',
  'paper.size': 'Tamaño',
  'paper.orientation': 'Orientación',
  'paper.portrait': 'Vertical',
  'paper.landscape': 'Horizontal',
  'paper.lineSpacing': 'Interlineado',
  'paper.grid': 'Cuadrícula',
  'paper.margins': 'Márgenes',
  'paper.top': 'Arriba',
  'paper.right': 'Derecha',
  'paper.bottom': 'Abajo',
  'paper.left': 'Izquierda',
  'paper.marginLine': 'Línea de margen',
  'paper.marginLineAt': 'Posición',
  'paper.headerLine': 'Línea de encabezado',
  'paper.color': 'Color del papel',
  'paper.lineColor': 'Color de las líneas',
  'paper.texture': 'Textura del papel',

  'ink.title': 'Tinta',
  'ink.font': 'Tipografía',
  'ink.size': 'Tamaño de letra',
  'ink.color': 'Color de tinta',
  'ink.opacity': 'Opacidad',
  'ink.bold': 'Trazo grueso',
  'ink.pressure': 'Presión del trazo',
  'ink.presets': 'Carácter de la escritura',
  'ink.neat': 'Pulcro',
  'ink.natural': 'Natural',
  'ink.messy': 'Desordenado',
  'ink.print': 'Impresión',
  'ink.cursive': 'Cursiva',

  'realism.title': 'Realismo',
  'realism.subtitle': 'Pequeñas imperfecciones, siempre reproducible.',
  'realism.rotation': 'Rotación de letras',
  'realism.size': 'Variación de tamaño',
  'realism.baseline': 'Temblor en la línea base',
  'realism.drift': 'Deriva de la línea',
  'realism.slant': 'Inclinación de la línea',
  'realism.wordSpacing': 'Espaciado entre palabras',
  'realism.letterSpacing': 'Espaciado entre letras',
  'realism.ink': 'Variación de tinta',
  'realism.margin': 'Margen irregular',
  'realism.seed': 'Semilla',
  'realism.reroll': 'Volver a barajar',
  'realism.hint': 'La misma semilla produce siempre la misma página. Cambia la semilla para otra versión igual de creíble.',

  'images.title': 'Imágenes',
  'images.drop': 'Arrastra una imagen aquí',
  'images.or': 'o elige un archivo',
  'images.add': 'Añadir imagen',
  'images.empty': 'Sin imágenes todavía.',
  'images.filter': 'Filtro',
  'images.none': 'Sin filtro',
  'images.grayscale': 'Blanco y negro',
  'images.printed': 'Impreso',
  'images.page': 'Página',
  'images.delete': 'Quitar',
  'images.hint': 'Arrastra la imagen en la página para moverla y usa los tiradores para cambiar el tamaño.',
  'images.selected': 'Imagen seleccionada',

  'export.title': 'Exportar documento',
  'export.subtitle': 'Mismo resultado que la vista previa, a la resolución que elijas.',
  'export.format': 'Formato',
  'export.pdf': 'PDF',
  'export.pdfNote': 'Una página por hoja',
  'export.png': 'PNG',
  'export.pngNote': 'Máxima nitidez',
  'export.jpg': 'JPG',
  'export.jpgNote': 'Archivo ligero',
  'export.range': 'Páginas',
  'export.all': 'Todas',
  'export.current': 'Actual',
  'export.dpi': 'Resolución',
  'export.quality': 'Calidad JPG',
  'export.download': 'Descargar',
  'export.exporting': 'Generando…',
  'export.pagesN': '{n} páginas',
  'export.pageN': '1 página',
  'export.note': '300 DPI es lo recomendado para imprimir; 150 DPI basta para pantalla.',
  'export.close': 'Cerrar',
  'export.fileReady': 'Archivo generado',

  'zoom.in': 'Acercar',
  'zoom.out': 'Alejar',
  'zoom.fit': 'Ajustar',
  'zoom.page': 'Página',
  'zoom.of': 'de',
  'preview.loading': 'Maquetando…',
  'preview.empty': 'Escribe algo para ver la magia.',

  'tabs.paper': 'Papel',
  'tabs.ink': 'Tinta',
  'tabs.realism': 'Realismo',
  'tabs.images': 'Imágenes',

  'common.reset': 'Restablecer',
  'common.delete': 'Eliminar',
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.undo': 'Deshacer',
  'common.import': 'Importar',
  'common.export': 'Exportar',
  'common.mm': 'mm',
  'common.on': 'Sí',
  'common.off': 'No',
};

const en: Record<keyof typeof es, string> = {
  'app.name': 'Escribano',
  'app.tagline': 'text that feels handwritten',
  'header.export': 'Export',
  'header.new': 'New',
  'header.saved': 'Autosaved',
  'header.language': 'Language',

  'editor.title': 'Your text',
  'editor.placeholder': 'Type or paste your text here…',
  'editor.help': 'Light Markdown: # heading · - list · $x^2$ · | table | · ---page---',
  'editor.bold': 'Bold',
  'editor.underline': 'Underline',
  'editor.math': 'Formula',
  'editor.table': 'Table',
  'editor.pagebreak': 'Page break',
  'editor.sample': 'Sample',
  'editor.clear': 'Clear',
  'editor.words': 'words',
  'editor.chars': 'characters',
  'editor.pages': 'pages',
  'editor.tip': 'Tip: leave a blank line between paragraphs to let them breathe.',

  'paper.title': 'Paper',
  'paper.template': 'Template',
  'paper.blank': 'Blank',
  'paper.ruled': 'Ruled',
  'paper.graph': 'Graph',
  'paper.dotted': 'Dotted',
  'paper.size': 'Size',
  'paper.orientation': 'Orientation',
  'paper.portrait': 'Portrait',
  'paper.landscape': 'Landscape',
  'paper.lineSpacing': 'Line spacing',
  'paper.grid': 'Grid',
  'paper.margins': 'Margins',
  'paper.top': 'Top',
  'paper.right': 'Right',
  'paper.bottom': 'Bottom',
  'paper.left': 'Left',
  'paper.marginLine': 'Margin line',
  'paper.marginLineAt': 'Position',
  'paper.headerLine': 'Header line',
  'paper.color': 'Paper colour',
  'paper.lineColor': 'Line colour',
  'paper.texture': 'Paper texture',

  'ink.title': 'Ink',
  'ink.font': 'Typeface',
  'ink.size': 'Letter size',
  'ink.color': 'Ink colour',
  'ink.opacity': 'Opacity',
  'ink.bold': 'Heavier stroke',
  'ink.pressure': 'Pen pressure',
  'ink.presets': 'Handwriting character',
  'ink.neat': 'Neat',
  'ink.natural': 'Natural',
  'ink.messy': 'Messy',
  'ink.print': 'Print',
  'ink.cursive': 'Cursive',

  'realism.title': 'Realism',
  'realism.subtitle': 'Tiny imperfections, always reproducible.',
  'realism.rotation': 'Letter rotation',
  'realism.size': 'Size variation',
  'realism.baseline': 'Baseline jitter',
  'realism.drift': 'Line drift',
  'realism.slant': 'Line slant',
  'realism.wordSpacing': 'Word spacing',
  'realism.letterSpacing': 'Letter spacing',
  'realism.ink': 'Ink variation',
  'realism.margin': 'Uneven margin',
  'realism.seed': 'Seed',
  'realism.reroll': 'Re-roll',
  'realism.hint': 'The same seed always produces the same page. Change it for another equally believable version.',

  'images.title': 'Images',
  'images.drop': 'Drop an image here',
  'images.or': 'or choose a file',
  'images.add': 'Add image',
  'images.empty': 'No images yet.',
  'images.filter': 'Filter',
  'images.none': 'No filter',
  'images.grayscale': 'Black & white',
  'images.printed': 'Printed',
  'images.page': 'Page',
  'images.delete': 'Remove',
  'images.hint': 'Drag the image on the page to move it and use the handles to resize.',
  'images.selected': 'Selected image',

  'export.title': 'Export document',
  'export.subtitle': 'Same result as the preview, at the resolution you choose.',
  'export.format': 'Format',
  'export.pdf': 'PDF',
  'export.pdfNote': 'One page per sheet',
  'export.png': 'PNG',
  'export.pngNote': 'Sharpest result',
  'export.jpg': 'JPG',
  'export.jpgNote': 'Smaller file',
  'export.range': 'Pages',
  'export.all': 'All',
  'export.current': 'Current',
  'export.dpi': 'Resolution',
  'export.quality': 'JPG quality',
  'export.download': 'Download',
  'export.exporting': 'Rendering…',
  'export.pagesN': '{n} pages',
  'export.pageN': '1 page',
  'export.note': '300 DPI is recommended for printing; 150 DPI is fine for screens.',
  'export.close': 'Close',
  'export.fileReady': 'File ready',

  'zoom.in': 'Zoom in',
  'zoom.out': 'Zoom out',
  'zoom.fit': 'Fit',
  'zoom.page': 'Page',
  'zoom.of': 'of',
  'preview.loading': 'Laying out…',
  'preview.empty': 'Type something to see the magic.',

  'tabs.paper': 'Paper',
  'tabs.ink': 'Ink',
  'tabs.realism': 'Realism',
  'tabs.images': 'Images',

  'common.reset': 'Reset',
  'common.delete': 'Delete',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.undo': 'Undo',
  'common.import': 'Import',
  'common.export': 'Export',
  'common.mm': 'mm',
  'common.on': 'On',
  'common.off': 'Off',
};

const dictionaries = { es, en };
export type TranslationKey = keyof typeof es;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  const stored = localStorage.getItem('escribano:lang');
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  const setLang = useCallback((next: Lang) => {
    localStorage.setItem('escribano:lang', next);
    setLangState(next);
  }, []);
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let value = dictionaries[lang][key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) value = value.replace(`{${k}}`, String(v));
      }
      return value;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

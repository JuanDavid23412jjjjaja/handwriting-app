import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  HandDocument,
  ImageFilter,
  ImageMode,
  Imperfections,
  InkConfig,
  PaperConfig,
  PlacedImage,
} from '@/engine/types';
import { randomSeed } from '@/engine/prng';

export const DEFAULT_TEXT = `Querida Gabriela:

Ha sido un verdadero placer aprender a tu lado y tener la oportunidad de acompañarte en este camino. Desde el primer día escuché a la estudiante brillante y comprometida que eres, y el tiempo me demostró exactamente eso.

Sé que te estás construyendo no solo académica y profesionalmente; cada aprendizaje lo utilizas para convertirte en un ser humano excepcional. Me llena de orgullo saber que en el futuro serás una persona increíble, llena de valores, conocimiento y empatía.

Gracias por cada conversación, por la curiosidad que contagia y por demostrar que la disciplina también puede ser alegre.

Con cariño,

Tu profesora`;

const paper: PaperConfig = {
  template: 'blank',
  size: 'A4',
  orientation: 'portrait',
  paperColor: '#fffdf7',
  lineColor: '#b9d2e8',
  lineSpacingMm: 8,
  gridSizeMm: 5,
  margins: { top: 22, right: 20, bottom: 22, left: 22 },
  marginLine: { enabled: false, color: '#e2a0a0', xMm: 20 },
  headerLine: false,
  headerHeightMm: 10,
  texture: 0.35,
};

const ink: InkConfig = {
  fontId: 'caveat',
  sizeMm: 6.2,
  color: '#16224f',
  opacity: 0.94,
  bold: false,
  pressure: 0.7,
};

const imperfections: Imperfections = {
  seed: 202604,
  letterRotation: 0.45,
  letterSize: 0.4,
  baselineJitter: 0.4,
  lineDrift: 0.35,
  lineSlant: 0.25,
  wordSpacing: 0.4,
  letterSpacing: 0.3,
  inkVariation: 0.45,
  marginWobble: 0.15,
};

export const PRESETS: Record<'neat' | 'natural' | 'messy', Partial<Imperfections>> = {
  neat: {
    letterRotation: 0.16,
    letterSize: 0.2,
    baselineJitter: 0.22,
    lineDrift: 0.16,
    lineSlant: 0.1,
    wordSpacing: 0.2,
    letterSpacing: 0.16,
    inkVariation: 0.22,
    marginWobble: 0.06,
  },
  natural: {
    letterRotation: 0.45,
    letterSize: 0.4,
    baselineJitter: 0.4,
    lineDrift: 0.35,
    lineSlant: 0.25,
    wordSpacing: 0.4,
    letterSpacing: 0.3,
    inkVariation: 0.45,
    marginWobble: 0.15,
  },
  messy: {
    letterRotation: 0.9,
    letterSize: 0.75,
    baselineJitter: 0.8,
    lineDrift: 0.7,
    lineSlant: 0.55,
    wordSpacing: 0.8,
    letterSpacing: 0.6,
    inkVariation: 0.8,
    marginWobble: 0.45,
  },
};

function newDocument(): HandDocument {
  return {
    version: 1,
    title: 'Carta sin título',
    text: DEFAULT_TEXT,
    paper: { ...paper, margins: { ...paper.margins }, marginLine: { ...paper.marginLine } },
    ink: { ...ink },
    imperfections: { ...imperfections },
    images: [],
  };
}

interface DocStore {
  doc: HandDocument;
  setTitle: (title: string) => void;
  setText: (text: string) => void;
  patchPaper: (patch: Partial<PaperConfig>) => void;
  patchMargins: (patch: Partial<PaperConfig['margins']>) => void;
  patchInk: (patch: Partial<InkConfig>) => void;
  patchImperfections: (patch: Partial<Imperfections>) => void;
  applyPreset: (preset: keyof typeof PRESETS) => void;
  reroll: () => void;
  addImage: (image: PlacedImage) => void;
  updateImage: (id: string, patch: Partial<PlacedImage>) => void;
  removeImage: (id: string) => void;
  setImageFilter: (id: string, filter: ImageFilter) => void;
  setImageMode: (id: string, mode: ImageMode) => void;
  moveImageToPage: (id: string, page: number) => void;
  reset: () => void;
  replaceDocument: (doc: HandDocument) => void;
}

export const useDocStore = create<DocStore>()(
  persist(
    (set) => ({
      doc: newDocument(),
      setTitle: (title) => set((s) => ({ doc: { ...s.doc, title } })),
      setText: (text) => set((s) => ({ doc: { ...s.doc, text } })),
      patchPaper: (patch) =>
        set((s) => ({ doc: { ...s.doc, paper: { ...s.doc.paper, ...patch } } })),
      patchMargins: (patch) =>
        set((s) => ({
          doc: { ...s.doc, paper: { ...s.doc.paper, margins: { ...s.doc.paper.margins, ...patch } } },
        })),
      patchInk: (patch) => set((s) => ({ doc: { ...s.doc, ink: { ...s.doc.ink, ...patch } } })),
      patchImperfections: (patch) =>
        set((s) => ({ doc: { ...s.doc, imperfections: { ...s.doc.imperfections, ...patch } } })),
      applyPreset: (preset) =>
        set((s) => ({ doc: { ...s.doc, imperfections: { ...s.doc.imperfections, ...PRESETS[preset] } } })),
      reroll: () =>
        set((s) => ({
          doc: { ...s.doc, imperfections: { ...s.doc.imperfections, seed: randomSeed() } },
        })),
      addImage: (image) => set((s) => ({ doc: { ...s.doc, images: [...s.doc.images, image] } })),
      updateImage: (id, patch) =>
        set((s) => ({
          doc: {
            ...s.doc,
            images: s.doc.images.map((img) => (img.id === id ? { ...img, ...patch } : img)),
          },
        })),
      removeImage: (id) =>
        set((s) => ({ doc: { ...s.doc, images: s.doc.images.filter((img) => img.id !== id) } })),
      setImageFilter: (id, filter) =>
        set((s) => ({
          doc: { ...s.doc, images: s.doc.images.map((img) => (img.id === id ? { ...img, filter } : img)) },
        })),
      setImageMode: (id, mode) =>
        set((s) => ({
          doc: { ...s.doc, images: s.doc.images.map((img) => (img.id === id ? { ...img, mode } : img)) },
        })),
      moveImageToPage: (id, page) =>
        set((s) => ({
          doc: { ...s.doc, images: s.doc.images.map((img) => (img.id === id ? { ...img, page } : img)) },
        })),
      reset: () => set({ doc: newDocument() }),
      replaceDocument: (doc) => set({ doc }),
    }),
    { name: 'escribano:doc:v1', version: 1 },
  ),
);

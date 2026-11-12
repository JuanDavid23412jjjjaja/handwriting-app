import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Image as KImage, Layer, Stage, Transformer } from 'react-konva';
import type { HandDocument, PagePlan, PlacedImage } from '@/engine/types';
import { paintPage } from '@/engine/render/painter';
import { mmToCssPx } from '@/engine/units';
import { useImageElements } from '@/hooks/useImageElements';

interface PageCanvasProps {
  page: PagePlan;
  doc: HandDocument;
  zoom: number;
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  onMoveImage: (id: string, patch: Partial<PlacedImage>) => void;
  onDropFile: (file: File, pageIndex: number) => void;
  pageIndex: number;
}

export function PageCanvas({
  page,
  doc,
  zoom,
  selectedImageId,
  onSelectImage,
  onMoveImage,
  onDropFile,
  pageIndex,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodes = useRef<Record<string, Konva.Image | null>>({});
  const imageElements = useImageElements(doc.images);
  const [dragOver, setDragOver] = useState(false);

  const cssW = mmToCssPx(page.widthMm, zoom);
  const cssH = mmToCssPx(page.heightMm, zoom);
  const pxPerMm = cssW / page.widthMm;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const ppm = pxPerMm * dpr;
    canvas.width = Math.round(page.widthMm * ppm);
    canvas.height = Math.round(page.heightMm * ppm);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintPage(ctx, page, ppm, { inkColor: doc.ink.color });
  }, [page, pxPerMm, doc.ink.color]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedImageId ? nodes.current[selectedImageId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedImageId, imageElements, page.images, zoom]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) onDropFile(file, pageIndex);
  };

  return (
    <div
      ref={wrapRef}
      className="relative rounded-[3px] bg-white page-shadow transition-shadow"
      style={{ width: cssW, height: cssH }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} className="block h-full w-full rounded-[3px]" style={{ width: cssW, height: cssH }} />

      {page.images.length > 0 && (
        <div className="absolute inset-0">
          <Stage width={cssW} height={cssH} onMouseDown={(e) => e.target === e.target.getStage() && onSelectImage(null)}>
            <Layer>
              {page.images.map((img) => {
                const el = imageElements.get(img.blobKey);
                if (!el) return null;
                const node = (
                  <KImage
                    key={img.id}
                    image={el}
                    x={img.xMm * pxPerMm}
                    y={img.yMm * pxPerMm}
                    width={img.widthMm * pxPerMm}
                    height={img.heightMm * pxPerMm}
                    rotation={img.rotation}
                    draggable={selectedImageId === img.id}
                    onClick={() => onSelectImage(img.id)}
                    onTap={() => onSelectImage(img.id)}
                    onDragEnd={(e) => {
                      onMoveImage(img.id, {
                        xMm: Math.max(0, Math.min(page.widthMm - img.widthMm, e.target.x() / pxPerMm)),
                        yMm: Math.max(0, Math.min(page.heightMm - img.heightMm, e.target.y() / pxPerMm)),
                      });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target as Konva.Image;
                      const sx = node.scaleX();
                      const sy = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      onMoveImage(img.id, {
                        xMm: node.x() / pxPerMm,
                        yMm: node.y() / pxPerMm,
                        widthMm: Math.max(4, (node.width() * sx) / pxPerMm),
                        heightMm: Math.max(4, (node.height() * sy) / pxPerMm),
                        rotation: node.rotation(),
                      });
                    }}
                    ref={(node) => {
                      nodes.current[img.id] = node;
                    }}
                  />
                );
                return node;
              })}
              <Transformer
                ref={trRef}
                rotateEnabled
                rotationSnaps={[0, 90, 180, 270]}
                borderStroke="#b0512f"
                anchorStroke="#b0512f"
                anchorFill="#fffdf8"
                anchorSize={8}
                anchorCornerRadius={4}
                borderDash={[4, 3]}
                boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
              />
            </Layer>
          </Stage>
        </div>
      )}

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[3px] border-2 border-dashed border-accent bg-accent/5">
          <span className="rounded-full bg-panel px-3 py-1 text-xs font-medium text-accent shadow">Suelta la imagen</span>
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Move,
  Save,
  Hand,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const TYPE_COLORS = {
  Suction: { border: '#d97706', bg: 'rgba(251,191,36,0.18)', badge: '#d97706' },
  Discharge: { border: '#0891b2', bg: 'rgba(34,211,238,0.18)', badge: '#0891b2' },
};

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

function clampBbox(bbox) {
  const w = Math.max(1.2, Math.min(bbox.w, 40));
  const h = Math.max(1.2, Math.min(bbox.h, 30));
  const x = Math.max(0, Math.min(bbox.x, 100 - w));
  const y = Math.max(0, Math.min(bbox.y, 100 - h));
  return { x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) };
}

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)));
}

/** Rasterize first PDF page so boxes can share the same zoom/pan transform. */
function usePdfPageImage(fileUrl, enabled) {
  const [imageUrl, setImageUrl] = useState(null);
  const [aspect, setAspect] = useState(1.414);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !fileUrl) {
      setImageUrl(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setImageUrl(null);
      try {
        const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        // Target ~2200px wide for crisp zoom-in without huge memory
        const scale = Math.min(3.5, Math.max(1.8, 2200 / base.width));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setAspect(viewport.height / viewport.width);
        setImageUrl(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to render PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, enabled]);

  return { imageUrl, aspect, loading, error };
}

function InteractiveBoxes({
  annotations,
  selectedId,
  onSelect,
  onBboxChange,
  editable,
}) {
  const layerRef = useRef(null);
  const dragRef = useRef(null);

  const clientToPercent = useCallback((clientX, clientY) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  useEffect(() => {
    if (!editable) return undefined;

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      const pos = clientToPercent(e.clientX, e.clientY);
      const dx = pos.x - drag.startPos.x;
      const dy = pos.y - drag.startPos.y;
      const o = drag.origin;

      let next = { ...o };
      if (drag.mode === 'move') {
        next = { x: o.x + dx, y: o.y + dy, w: o.w, h: o.h };
      } else {
        const handle = drag.mode;
        if (handle.includes('e')) next.w = o.w + dx;
        if (handle.includes('s')) next.h = o.h + dy;
        if (handle.includes('w')) {
          next.x = o.x + dx;
          next.w = o.w - dx;
        }
        if (handle.includes('n')) {
          next.y = o.y + dy;
          next.h = o.h - dy;
        }
      }
      onBboxChange?.(drag.id, clampBbox(next));
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [editable, clientToPercent, onBboxChange]);

  const startDrag = (e, id, mode, bbox) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
    dragRef.current = {
      id,
      mode,
      origin: { ...bbox },
      startPos: clientToPercent(e.clientX, e.clientY),
    };
  };

  if (!annotations?.length) return null;

  return (
    <div ref={layerRef} className="absolute inset-0 z-10 pointer-events-none">
      {annotations.map((ann) => {
        if (!ann.bbox) return null;
        const colors = TYPE_COLORS[ann.type] || TYPE_COLORS.Suction;
        const isSelected = selectedId === ann.id;
        const isManual = ann.manually_labeled;
        const { x, y, w, h } = ann.bbox;
        const borderColor = isManual ? '#059669' : colors.border;

        return (
          <div
            key={ann.id}
            onMouseDown={(e) => startDrag(e, ann.id, 'move', ann.bbox)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(ann.id);
            }}
            className={`absolute box-border pointer-events-auto ${
              editable ? 'cursor-move' : 'cursor-pointer'
            }`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
              border: `${isSelected ? 2.5 : 1.5}px ${isManual ? 'solid' : 'dashed'} ${borderColor}`,
              background: isSelected ? colors.bg : 'rgba(255,255,255,0.05)',
              borderRadius: 3,
              boxShadow: isSelected ? `0 0 0 2px ${borderColor}55` : 'none',
            }}
          >
            <div
              className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white pointer-events-none whitespace-nowrap"
              style={{ background: isManual ? '#059669' : colors.badge }}
            >
              {ann.id}
            </div>

            {editable &&
              isSelected &&
              HANDLES.map((handle) => {
                const style = {
                  nw: { left: -4, top: -4, cursor: 'nwse-resize' },
                  n: { left: '50%', top: -4, marginLeft: -4, cursor: 'ns-resize' },
                  ne: { right: -4, top: -4, cursor: 'nesw-resize' },
                  e: { right: -4, top: '50%', marginTop: -4, cursor: 'ew-resize' },
                  se: { right: -4, bottom: -4, cursor: 'nwse-resize' },
                  s: { left: '50%', bottom: -4, marginLeft: -4, cursor: 'ns-resize' },
                  sw: { left: -4, bottom: -4, cursor: 'nesw-resize' },
                  w: { left: -4, top: '50%', marginTop: -4, cursor: 'ew-resize' },
                }[handle];

                return (
                  <div
                    key={handle}
                    onMouseDown={(e) => startDrag(e, ann.id, handle, ann.bbox)}
                    className="absolute w-2 h-2 bg-white border-2 border-[#1e5a8a] rounded-sm z-20"
                    style={style}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function DrawingOverlay({ active, onBoxComplete, hint = 'Drag to add a new component' }) {
  const overlayRef = useRef(null);
  const [drawing, setDrawing] = useState(null);

  const toPercentBbox = useCallback((x1, y1, x2, y2) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const left = Math.min(x1, x2) - rect.left;
    const top = Math.min(y1, y2) - rect.top;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    if (width < 8 || height < 8) return null;
    return {
      x: (left / rect.width) * 100,
      y: (top / rect.height) * 100,
      w: (width / rect.width) * 100,
      h: (height / rect.height) * 100,
    };
  }, []);

  if (!active) return null;

  let previewStyle = null;
  if (drawing && overlayRef.current) {
    const rect = overlayRef.current.getBoundingClientRect();
    previewStyle = {
      left: `${Math.min(drawing.startX, drawing.currentX) - rect.left}px`,
      top: `${Math.min(drawing.startY, drawing.currentY) - rect.top}px`,
      width: `${Math.abs(drawing.currentX - drawing.startX)}px`,
      height: `${Math.abs(drawing.currentY - drawing.startY)}px`,
    };
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 cursor-crosshair"
      onMouseDown={(e) => {
        e.stopPropagation();
        setDrawing({
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
        });
      }}
      onMouseMove={(e) =>
        drawing && setDrawing((p) => ({ ...p, currentX: e.clientX, currentY: e.clientY }))
      }
      onMouseUp={() => {
        if (!drawing) return;
        const bbox = toPercentBbox(
          drawing.startX,
          drawing.startY,
          drawing.currentX,
          drawing.currentY,
        );
        setDrawing(null);
        if (bbox) onBoxComplete?.(clampBbox(bbox));
      }}
      onMouseLeave={() => drawing && setDrawing(null)}
    >
      {previewStyle && (
        <div
          className="absolute border-2 border-orange-500 bg-orange-400/15 pointer-events-none"
          style={previewStyle}
        />
      )}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium pointer-events-none shadow-sm">
        {hint}
      </div>
    </div>
  );
}

function ZoomableStage({
  imageUrl,
  imageAlt,
  aspect,
  zoom,
  setZoom,
  showArrows,
  annotations,
  selectedId,
  onSelect,
  onBboxChange,
  editMode,
  drawMode,
  onBoxDrawn,
  panMode,
  drawHint = 'Drag to add a new component',
}) {
  const viewportRef = useRef(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const canPan = panMode || spaceDown;

  const applyZoomAt = useCallback((nextZoom, clientX, clientY) => {
    const el = viewportRef.current;
    if (!el) {
      setZoom(clampZoom(nextZoom));
      return;
    }
    const oldZoom = zoomRef.current;
    const next = clampZoom(nextZoom);
    if (next === oldZoom) return;

    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const ratio = next / oldZoom;

    setZoom(next);
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollLeft + mx) * ratio - mx;
      el.scrollTop = (el.scrollTop + my) * ratio - my;
    });
  }, [setZoom]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      // Ctrl/Cmd + wheel → zoom (boxes stay locked to diagram)
      // Plain wheel → scroll (pan vertically / shift for horizontal)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        applyZoomAt(zoomRef.current * factor, e.clientX, e.clientY);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoomAt]);

  const startPan = (e) => {
    if (drawMode) return;
    const el = viewportRef.current;
    if (!el) return;
    // Middle mouse, Hand mode, or Space+drag
    const usePan = e.button === 1 || (e.button === 0 && canPan);
    if (!usePan) return;
    e.preventDefault();
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      sl: el.scrollLeft,
      st: el.scrollTop,
    };
    setPanning(true);
  };

  useEffect(() => {
    if (!panning) return undefined;

    const onMove = (e) => {
      const pan = panRef.current;
      const el = viewportRef.current;
      if (!pan || !el) return;
      el.scrollLeft = pan.sl - (e.clientX - pan.x);
      el.scrollTop = pan.st - (e.clientY - pan.y);
    };
    const onUp = () => {
      panRef.current = null;
      setPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panning]);

  const cursor = panning
    ? 'cursor-grabbing'
    : canPan
      ? 'cursor-grab'
      : 'cursor-default';

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 overflow-auto bg-[#e8eaed] ${cursor}`}
      onMouseDown={startPan}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Stage grows with zoom; boxes are % of this same box → stay pinned to the drawing */}
      <div
        className="relative bg-white shadow-sm"
        style={{
          width: `${zoom * 100}%`,
          paddingBottom: `${aspect * zoom * 100}%`,
          height: 0,
        }}
      >
        <div className="absolute inset-0">
          <img
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
          />

          {showArrows && (
            <InteractiveBoxes
              annotations={annotations}
              selectedId={selectedId}
              onSelect={onSelect}
              onBboxChange={onBboxChange}
              editable={editMode && !canPan}
            />
          )}

          <DrawingOverlay active={drawMode} onBoxComplete={onBoxDrawn} hint={drawHint} />
        </div>
      </div>
    </div>
  );
}

export default function DocumentPreview({
  fileUrl,
  fileName,
  fileType,
  annotations = [],
  selectedId,
  onSelect,
  showArrows = false,
  drawMode = false,
  onDrawModeChange,
  onBoxDrawn,
  onBboxChange,
  onSaveTraining,
  savingTraining = false,
  drawHint = 'Drag to add a new component',
  emptyMessage = 'Upload a PDF drawing to preview it here.',
  className = '',
}) {
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);

  const isPdf = useMemo(() => {
    if (fileType) return fileType === 'application/pdf';
    return fileName?.toLowerCase().endsWith('.pdf');
  }, [fileType, fileName]);

  const isImage = useMemo(() => {
    if (fileType) return fileType.startsWith('image/');
    return /\.(png|jpe?g|webp)$/i.test(fileName || '');
  }, [fileType, fileName]);

  const useRasterStage = Boolean(fileUrl && (isPdf || isImage));
  const pdf = usePdfPageImage(fileUrl, Boolean(fileUrl && isPdf));
  const [imageAspect, setImageAspect] = useState(0.707);

  useEffect(() => {
    if (!fileUrl || !isImage) return undefined;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0) setImageAspect(img.naturalHeight / img.naturalWidth);
    };
    img.src = fileUrl;
    return undefined;
  }, [fileUrl, isImage]);

  const stageImageUrl = isPdf ? pdf.imageUrl : isImage ? fileUrl : null;
  const stageAspect = isPdf ? pdf.aspect : imageAspect;

  const editMode = showArrows && !drawMode && !!onBboxChange;

  useEffect(() => {
    setZoom(1);
    setPanMode(false);
  }, [fileUrl]);

  useEffect(() => {
    if (drawMode) setPanMode(false);
  }, [drawMode]);

  const bumpZoom = (delta) => {
    setZoom((z) => clampZoom(z + delta));
  };

  return (
    <div className={`flex flex-col fse-card overflow-hidden ${className}`}>
      <div className="fse-card-header gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ZoomIn className="w-4 h-4 text-[#1e5a8a] shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate">
            {fileName || 'Document Preview'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {showArrows && annotations.length > 0 && (
            <span className="fse-badge-blue hidden sm:inline">{annotations.length} boxes</span>
          )}

          {fileUrl && useRasterStage && (
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
              <button
                type="button"
                title="Zoom out"
                onClick={() => bumpZoom(-0.25)}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-medium text-gray-600 tabular-nums min-w-[3rem] text-center border-x border-gray-200">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                title="Zoom in"
                onClick={() => bumpZoom(0.25)}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Fit width"
                onClick={() => setZoom(1)}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-50 border-l border-gray-200"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Pan (or hold Space + drag)"
                onClick={() => setPanMode((p) => !p)}
                className={`px-2 py-1.5 border-l border-gray-200 ${
                  panMode ? 'bg-[#1e5a8a] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onSaveTraining && annotations.length > 0 && (
            <button
              type="button"
              onClick={onSaveTraining}
              disabled={savingTraining}
              className="fse-btn-orange text-xs flex items-center gap-1.5 py-1.5 disabled:opacity-50"
              title="Save all box positions & labels for future training"
            >
              <Save className="w-3.5 h-3.5" />
              {savingTraining ? 'Saving…' : 'Save Training'}
            </button>
          )}

          {onDrawModeChange && fileUrl && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => onDrawModeChange(false)}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${
                  !drawMode ? 'bg-[#1e5a8a] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Move className="w-3 h-3" /> Adjust
              </button>
              <button
                type="button"
                onClick={() => onDrawModeChange(true)}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-gray-200 ${
                  drawMode ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Square className="w-3 h-3" /> Draw
              </button>
            </div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800">
          Zoom with <strong>+/−</strong> or <strong>Ctrl+scroll</strong> · pan with{' '}
          <strong>scrollbars</strong>, <strong>Hand</strong>, or <strong>Space+drag</strong> ·
          boxes stay locked to the drawing · then <strong>Save Training</strong>
        </div>
      )}

      <div className="relative flex-1 min-h-[320px] bg-gray-100">
        {!fileUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
            <FileText className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm text-center text-gray-500">{emptyMessage}</p>
          </div>
        ) : isPdf && pdf.loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Rendering drawing for labeling…
          </div>
        ) : isPdf && pdf.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm text-red-600">Could not render PDF: {pdf.error}</p>
            <p className="text-xs text-gray-500">Falling back to browser PDF viewer (boxes may drift when zooming).</p>
            <iframe
              src={`${fileUrl}#view=FitH`}
              title="Drawing preview fallback"
              className="w-full flex-1 min-h-[280px] border border-gray-200 rounded bg-white"
            />
          </div>
        ) : stageImageUrl ? (
          <ZoomableStage
            imageUrl={stageImageUrl}
            imageAlt={fileName || 'Drawing'}
            aspect={stageAspect}
            zoom={zoom}
            setZoom={setZoom}
            showArrows={showArrows}
            annotations={annotations}
            selectedId={selectedId}
            onSelect={onSelect}
            onBboxChange={onBboxChange}
            editMode={editMode}
            drawMode={drawMode}
            onBoxDrawn={onBoxDrawn}
            panMode={panMode}
            drawHint={drawHint}
          />
        ) : (
          <iframe
            src={fileUrl}
            title="Drawing preview"
            className="absolute inset-0 w-full h-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

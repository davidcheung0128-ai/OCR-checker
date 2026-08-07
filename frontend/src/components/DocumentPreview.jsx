import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { FileText, ZoomIn, Square, Move, Save } from 'lucide-react';

const TYPE_COLORS = {
  Suction: { border: '#d97706', bg: 'rgba(251,191,36,0.18)', badge: '#d97706' },
  Discharge: { border: '#0891b2', bg: 'rgba(34,211,238,0.18)', badge: '#0891b2' },
};

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function clampBbox(bbox) {
  const w = Math.max(1.2, Math.min(bbox.w, 40));
  const h = Math.max(1.2, Math.min(bbox.h, 30));
  const x = Math.max(0, Math.min(bbox.x, 100 - w));
  const y = Math.max(0, Math.min(bbox.y, 100 - h));
  return { x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) };
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
    <div ref={layerRef} className="absolute inset-0 z-10">
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
            className={`absolute box-border ${editable ? 'cursor-move' : 'cursor-pointer'}`}
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
            {/* Number badge */}
            <div
              className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white pointer-events-none whitespace-nowrap"
              style={{ background: isManual ? '#059669' : colors.badge }}
            >
              {ann.id}
            </div>

            {/* Resize handles when selected + editable */}
            {editable && isSelected &&
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

function DrawingOverlay({ active, onBoxComplete }) {
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
      onMouseDown={(e) => setDrawing({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY })}
      onMouseMove={(e) => drawing && setDrawing((p) => ({ ...p, currentX: e.clientX, currentY: e.clientY }))}
      onMouseUp={() => {
        if (!drawing) return;
        const bbox = toPercentBbox(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY);
        setDrawing(null);
        if (bbox) onBoxComplete?.(clampBbox(bbox));
      }}
      onMouseLeave={() => drawing && setDrawing(null)}
    >
      {previewStyle && (
        <div className="absolute border-2 border-orange-500 bg-orange-400/15 pointer-events-none" style={previewStyle} />
      )}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium pointer-events-none shadow-sm">
        Drag to draw a new box
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
  emptyMessage = 'Upload a PDF drawing to preview it here.',
  className = '',
}) {
  const isPdf = useMemo(() => {
    if (fileType) return fileType === 'application/pdf';
    return fileName?.toLowerCase().endsWith('.pdf');
  }, [fileType, fileName]);

  const isImage = useMemo(() => {
    if (fileType) return fileType.startsWith('image/');
    return /\.(png|jpe?g|webp)$/i.test(fileName || '');
  }, [fileType, fileName]);

  const editMode = showArrows && !drawMode && !!onBboxChange;

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
          Drag boxes onto the duct · pull corner/edge handles to resize · then click <strong>Save Training</strong>
        </div>
      )}

      <div className="relative flex-1 min-h-[320px] bg-gray-100">
        {!fileUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
            <FileText className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm text-center text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className={`absolute inset-0 overflow-auto ${drawMode || editMode ? 'pointer-events-none' : ''}`}>
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#view=FitH`}
                  title="Drawing preview"
                  className="w-full h-full min-h-[320px] border-0 bg-white"
                />
              ) : isImage ? (
                <img src={fileUrl} alt={fileName} className="w-full h-full object-contain" />
              ) : (
                <iframe src={fileUrl} title="Drawing preview" className="w-full h-full min-h-[320px] border-0" />
              )}
            </div>

            {showArrows && (
              <InteractiveBoxes
                annotations={annotations}
                selectedId={selectedId}
                onSelect={onSelect}
                onBboxChange={onBboxChange}
                editable={editMode}
              />
            )}

            <DrawingOverlay active={drawMode} onBoxComplete={onBoxDrawn} />
          </>
        )}
      </div>
    </div>
  );
}

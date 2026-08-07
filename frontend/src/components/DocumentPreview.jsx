import React, { useMemo, useRef, useState, useCallback } from 'react';
import { FileText, ZoomIn, MousePointer2, Square } from 'lucide-react';

const TYPE_COLORS = {
  Suction: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.15)', badge: '#d97706' },
  Discharge: { stroke: '#22d3ee', fill: 'rgba(34,211,238,0.15)', badge: '#0891b2' },
};

function getLabelPosition(bbox, index) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const offsets = [
    { lx: bbox.x - 14, ly: bbox.y - 8 },
    { lx: bbox.x + bbox.w + 4, ly: bbox.y + bbox.h / 2 - 4 },
    { lx: bbox.x + bbox.w / 2 - 4, ly: bbox.y - 10 },
    { lx: bbox.x - 14, ly: bbox.y + bbox.h + 2 },
    { lx: bbox.x + bbox.w + 4, ly: bbox.y - 4 },
  ];
  const pos = offsets[index % offsets.length];
  return {
    cx,
    cy,
    lx: Math.min(Math.max(pos.lx, 2), 88),
    ly: Math.min(Math.max(pos.ly, 2), 90),
  };
}

function AnnotationOverlay({ annotations, selectedId, onSelect, showArrows }) {
  if (!annotations?.length) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {annotations.map((ann) => (
          <marker
            key={`marker-${ann.id}`}
            id={`arrowhead-${ann.id}`}
            markerWidth="4"
            markerHeight="4"
            refX="3"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 4 2, 0 4" fill={TYPE_COLORS[ann.type]?.stroke || '#60a5fa'} />
          </marker>
        ))}
      </defs>

      {annotations.map((ann, index) => {
        const colors = TYPE_COLORS[ann.type] || TYPE_COLORS.Suction;
        const isSelected = selectedId === ann.id;
        const isManual = ann.manually_labeled;
        const { cx, cy, lx, ly } = getLabelPosition(ann.bbox, index);
        const { x, y, w, h } = ann.bbox;

        return (
          <g key={ann.id} className="pointer-events-auto cursor-pointer" onClick={() => onSelect?.(ann.id)}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isSelected ? colors.fill : 'transparent'}
              stroke={isManual ? '#34d399' : colors.stroke}
              strokeWidth={isSelected ? 0.4 : 0.25}
              strokeDasharray={isManual ? 'none' : isSelected ? 'none' : '0.8 0.4'}
              rx={0.4}
            />

            {showArrows && (
              <>
                <line
                  x1={lx + 3}
                  y1={ly + 2.5}
                  x2={cx}
                  y2={cy}
                  stroke={isManual ? '#34d399' : colors.stroke}
                  strokeWidth={isSelected ? 0.35 : 0.22}
                  markerEnd={`url(#arrowhead-${ann.id})`}
                />
                <rect
                  x={lx}
                  y={ly}
                  width={6}
                  height={5}
                  rx={0.8}
                  fill={isManual ? '#059669' : colors.badge}
                  stroke={isSelected ? '#fff' : isManual ? '#34d399' : colors.stroke}
                  strokeWidth={isSelected ? 0.25 : 0}
                />
                <text
                  x={lx + 3}
                  y={ly + 3.5}
                  textAnchor="middle"
                  fontSize="2.8"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {ann.id}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
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

  const handleMouseDown = (e) => {
    if (!active) return;
    setDrawing({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    setDrawing((prev) => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    const bbox = toPercentBbox(drawing.startX, drawing.startY, drawing.currentX, drawing.currentY);
    setDrawing(null);
    if (bbox) onBoxComplete?.(bbox);
  };

  if (!active) return null;

  let previewStyle = null;
  if (drawing && overlayRef.current) {
    const rect = overlayRef.current.getBoundingClientRect();
    const left = Math.min(drawing.startX, drawing.currentX) - rect.left;
    const top = Math.min(drawing.startY, drawing.currentY) - rect.top;
    previewStyle = {
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.abs(drawing.currentX - drawing.startX)}px`,
      height: `${Math.abs(drawing.currentY - drawing.startY)}px`,
    };
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {previewStyle && (
        <div
          className="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-none"
          style={previewStyle}
        />
      )}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium pointer-events-none shadow-sm">
        Drag to draw a box around the component
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

  return (
    <div className={`flex flex-col fse-card overflow-hidden ${className}`}>
      <div className="fse-card-header gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ZoomIn className="w-4 h-4 text-[#1e5a8a] shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate">
            {fileName || 'Document Preview'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showArrows && annotations.length > 0 && (
            <span className="fse-badge-blue hidden sm:inline">{annotations.length} components</span>
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
                <MousePointer2 className="w-3 h-3" /> View
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

      <div className="relative flex-1 min-h-[320px] bg-gray-100">
        {!fileUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
            <FileText className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm text-center text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className={`absolute inset-0 overflow-auto ${drawMode ? 'pointer-events-none' : ''}`}>
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

            <AnnotationOverlay
              annotations={annotations}
              selectedId={selectedId}
              onSelect={onSelect}
              showArrows={showArrows && !drawMode}
            />

            <DrawingOverlay active={drawMode} onBoxComplete={onBoxDrawn} />
          </>
        )}
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { FileText, ZoomIn } from 'lucide-react';

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
      className="absolute inset-0 w-full h-full pointer-events-none"
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
            <polygon
              points="0 0, 4 2, 0 4"
              fill={TYPE_COLORS[ann.type]?.stroke || '#60a5fa'}
            />
          </marker>
        ))}
      </defs>

      {annotations.map((ann, index) => {
        const colors = TYPE_COLORS[ann.type] || TYPE_COLORS.Suction;
        const isSelected = selectedId === ann.id;
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
              stroke={colors.stroke}
              strokeWidth={isSelected ? 0.35 : 0.2}
              strokeDasharray={isSelected ? 'none' : '0.8 0.4'}
              rx={0.4}
            />

            {showArrows && (
              <>
                <line
                  x1={lx + 3}
                  y1={ly + 2.5}
                  x2={cx}
                  y2={cy}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 0.3 : 0.2}
                  markerEnd={`url(#arrowhead-${ann.id})`}
                />
                <rect
                  x={lx}
                  y={ly}
                  width={6}
                  height={5}
                  rx={0.8}
                  fill={colors.badge}
                  stroke={isSelected ? '#fff' : colors.stroke}
                  strokeWidth={isSelected ? 0.25 : 0}
                />
                <text
                  x={lx + 3}
                  y={ly + 3.5}
                  textAnchor="middle"
                  fontSize="2.8"
                  fill="#fff"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {ann.id}
                </text>
              </>
            )}

            {!showArrows && (
              <circle cx={cx} cy={cy} r={1.2} fill={colors.stroke} opacity={0.8} />
            )}
          </g>
        );
      })}
    </svg>
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
    <div className={`flex flex-col bg-slate-800 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <ZoomIn className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate">
            {fileName || 'Document Preview'}
          </span>
        </div>
        {showArrows && annotations.length > 0 && (
          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
            {annotations.length} components annotated
          </span>
        )}
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-900/60">
        {!fileUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8">
            <FileText className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm text-center">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 overflow-auto">
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#view=FitH`}
                  title="Drawing preview"
                  className="w-full h-full min-h-[320px] border-0 bg-white"
                />
              ) : isImage ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={fileUrl}
                  title="Drawing preview"
                  className="w-full h-full min-h-[320px] border-0"
                />
              )}
            </div>

            <AnnotationOverlay
              annotations={annotations}
              selectedId={selectedId}
              onSelect={onSelect}
              showArrows={showArrows}
            />
          </>
        )}
      </div>
    </div>
  );
}

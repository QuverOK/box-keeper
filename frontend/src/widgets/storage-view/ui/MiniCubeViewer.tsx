type ViewMode = "XY" | "XZ" | "YZ";
interface MiniCubeViewerProps {
  viewMode: ViewMode;
  gridSize: {
    x: number;
    y: number;
    z: number;
  };
}
const inactiveStroke = "var(--muted-foreground)";
export function MiniCubeViewer({ viewMode, gridSize }: MiniCubeViewerProps) {
  return (
    <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
      <p className="text-xs text-muted-foreground mb-2 text-center">
        Текущий вид
      </p>
      <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto">
        <defs>
          <linearGradient id="topFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={viewMode === "XY" ? "#3b82f6" : "var(--muted)"}
            />
            <stop
              offset="100%"
              stopColor={viewMode === "XY" ? "#2563eb" : "var(--border)"}
            />
          </linearGradient>
          <linearGradient id="frontFace" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={viewMode === "YZ" ? "#3b82f6" : "var(--secondary)"}
            />
            <stop
              offset="100%"
              stopColor={viewMode === "YZ" ? "#2563eb" : "var(--muted)"}
            />
          </linearGradient>
          <linearGradient id="sideFace" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={viewMode === "XZ" ? "#3b82f6" : "var(--accent)"}
            />
            <stop
              offset="100%"
              stopColor={viewMode === "XZ" ? "#2563eb" : "var(--secondary)"}
            />
          </linearGradient>
        </defs>

        <g transform="translate(70, 40)">
          <path
            d="M 0,0 L 35,-20 L 0,-40 L -35,-20 Z"
            fill="url(#topFace)"
            stroke={viewMode === "XY" ? "#1d4ed8" : inactiveStroke}
            strokeWidth={viewMode === "XY" ? "2" : "1"}
          />

          <path
            d="M -35,-20 L 0,-40 L 0,0 L -35,20 Z"
            fill="url(#frontFace)"
            stroke={viewMode === "YZ" ? "#1d4ed8" : inactiveStroke}
            strokeWidth={viewMode === "YZ" ? "2" : "1"}
          />

          <path
            d="M 0,0 L 35,-20 L 35,20 L 0,40 Z"
            fill="url(#sideFace)"
            stroke={viewMode === "XZ" ? "#1d4ed8" : inactiveStroke}
            strokeWidth={viewMode === "XZ" ? "2" : "1"}
          />

          <g>
            <line
              x1="0"
              y1="40"
              x2="50"
              y2="15"
              stroke="#ef4444"
              strokeWidth="2"
              markerEnd="url(#arrowX)"
            />
            <text x="55" y="18" fill="#ef4444" fontSize="12" fontWeight="bold">
              X
            </text>

            <line
              x1="0"
              y1="40"
              x2="-50"
              y2="15"
              stroke="#22c55e"
              strokeWidth="2"
              markerEnd="url(#arrowY)"
            />
            <text x="-60" y="18" fill="#22c55e" fontSize="12" fontWeight="bold">
              Y
            </text>

            <line
              x1="0"
              y1="40"
              x2="0"
              y2="-10"
              stroke="#3b82f6"
              strokeWidth="2"
              markerEnd="url(#arrowZ)"
            />
            <text x="-8" y="-12" fill="#3b82f6" fontSize="12" fontWeight="bold">
              Z
            </text>
          </g>

          <defs>
            <marker
              id="arrowX"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
            </marker>
            <marker
              id="arrowY"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
            <marker
              id="arrowZ"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
            </marker>
          </defs>
        </g>

        <g transform="translate(70, 115)">
          <text
            x="0"
            y="0"
            fill="var(--foreground)"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {viewMode === "XY" && "↓ Вид сверху"}
            {viewMode === "XZ" && "→ Вид сбоку"}
            {viewMode === "YZ" && "← Вид спереди"}
          </text>
        </g>
      </svg>

      <div className="mt-2 text-center">
        <p className="text-xs text-muted-foreground">
          Размер: {gridSize.x}×{gridSize.y}×{gridSize.z}
        </p>
      </div>
    </div>
  );
}

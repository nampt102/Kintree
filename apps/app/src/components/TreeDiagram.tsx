import type { ChildKind, Layout, TreeDoc, TreePerson } from '@kintree/core'
import {
  Background,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowUp, Heart, Maximize, Minus, Trash2, UserPlus, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lifespan } from '../lib/format.ts'
import { IconButton, usePrefersReducedMotion } from '../ui/index.ts'

export type NodeAction = 'addParent' | 'addChild' | 'addSpouse' | 'remove' | 'toggleCollapse'

/** Cỡ khung người (design D5); truyền vào computeLayout. */
export const CARD = { width: 176, height: 72 }

type PersonData = {
  person: TreePerson
  hiddenCount: number
  collapsed: boolean
  hasChildren: boolean
  selected: boolean
  highlighted: boolean
  canAddParent: boolean
  canAddChild: boolean
  canAddSpouse: boolean
  canRemove: boolean
  onAction: (id: string, action: NodeAction) => void
}

type PersonNode = Node<PersonData, 'person'>
type LabelNode = Node<{ text: string }, 'rowLabel'>
type JunctionNode = Node<Record<string, never>, 'junction'>

/** Nút quanh khung, luôn nằm hẳn ngoài khung để không che vùng bấm giữa khung dù đang phóng nhỏ (nút giữ 44 px trên màn hình nên to hơn khi thu nhỏ). Chỉ hiện trên thiết bị có trỏ chuột (hover) hoặc khi điều khiển bằng bàn phím; cảm ứng dùng bảng thông tin. */
function HoverAction({ icon, label, onClick, className }: { icon: LucideIcon; label: string; onClick: () => void; className: string }) {
  return (
    <IconButton
      icon={icon}
      label={label}
      variant="secondary"
      className={`kt-node-btn absolute opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:hidden ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    />
  )
}

const PersonCard = memo(function PersonCard({ data }: NodeProps<PersonNode>) {
  const { person, hiddenCount, collapsed, selected, highlighted } = data
  const dead = person.death !== undefined
  const years = lifespan(person)
  const name = person.fullName
  return (
    <div className="group relative h-full w-full">
      <Handle id="t" type="target" position={Position.Top} className="!opacity-0" />
      <Handle id="l" type="target" position={Position.Left} className="!opacity-0" />
      <Handle id="r" type="source" position={Position.Right} className="!opacity-0" />
      <div
        data-person-id={person.id}
        className={[
          'flex h-full w-full cursor-pointer flex-col justify-center rounded-md px-3 text-center',
          dead ? 'border border-dashed border-line-strong bg-surface-muted' : 'border border-line-strong bg-surface shadow-card',
          selected ? '!border-2 !border-solid !border-accent' : '',
          highlighted ? 'kt-glow' : '',
        ].join(' ')}
      >
        <div className="line-clamp-2 text-sm font-semibold leading-tight text-ink" title={name}>
          {name}
        </div>
        {(years || person.isOutsider) && (
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            {years && <span className="tabular">{years}</span>}
            {person.isOutsider && (
              <span className="rounded-full bg-surface-muted px-1.5 leading-5 text-ink-muted ring-1 ring-line">{person.gender === 'male' ? 'Rể' : 'Dâu'}</span>
            )}
          </div>
        )}
      </div>

      {data.canAddParent && <HoverAction icon={ArrowUp} label={`Thêm cha/mẹ cho ${name}`} onClick={() => data.onAction(person.id, 'addParent')} className="bottom-full left-1/2 mb-1 -translate-x-1/2" />}
      {data.canAddChild && <HoverAction icon={UserPlus} label={`Thêm con cho ${name}`} onClick={() => data.onAction(person.id, 'addChild')} className="right-full top-full mr-0.5 mt-1" />}
      {data.canAddSpouse && <HoverAction icon={Heart} label={`Thêm vợ/chồng cho ${name}`} onClick={() => data.onAction(person.id, 'addSpouse')} className="left-full top-1/2 ml-1 -translate-y-1/2" />}
      {data.canRemove && <HoverAction icon={Trash2} label={`Gỡ ${name}`} onClick={() => data.onAction(person.id, 'remove')} className="bottom-full left-full mb-0.5 ml-0.5" />}

      {data.hasChildren && (
        <>
          {/* Nhãn số người đang ẩn vẫn hiện khi thu quá nhỏ (lúc đó nút bị ẩn). */}
          {collapsed && (
            <span aria-hidden className="kt-zoomed-out-only absolute -bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full border border-line-strong bg-surface px-1.5 text-xs font-semibold leading-6 text-ink">
              +{hiddenCount}
            </span>
          )}
          <button
            type="button"
            aria-label={collapsed ? `Mở nhánh của ${name}` : `Thu gọn nhánh của ${name}`}
            aria-expanded={!collapsed}
            className="kt-node-btn absolute left-1/2 top-full flex -translate-x-1/2 cursor-pointer items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              data.onAction(person.id, 'toggleCollapse')
            }}
          >
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full border border-line-strong bg-surface px-1.5 text-xs font-semibold text-ink shadow-card">
              {collapsed ? `+${hiddenCount}` : <Minus aria-hidden size={14} strokeWidth={2} />}
            </span>
          </button>
        </>
      )}
    </div>
  )
})

const Junction = () => (
  <div className="size-px">
    <Handle id="b" type="source" position={Position.Bottom} className="!opacity-0" />
  </div>
)

const RowLabel = ({ data }: NodeProps<LabelNode>) => (
  <div className="pointer-events-none whitespace-nowrap text-base font-semibold text-ink-muted">{data.text}</div>
)

const nodeTypes = { person: PersonCard, rowLabel: RowLabel, junction: Junction }

const edgeStyle: Record<ChildKind, { strokeDasharray?: string }> = {
  biological: {},
  adopted: { strokeDasharray: '8 5' },
  step: { strokeDasharray: '2 5' },
}

export type DiagramProps = {
  doc: TreeDoc
  layout: Layout
  selectedId: string | null
  highlightId: string | null
  focusKey: string
  showMiniMap: boolean
  /** Cỡ gọn: không thu nhỏ quá mức đọc được. */
  compact: boolean
  actionsFor: (p: TreePerson) => Pick<PersonData, 'canAddParent' | 'canAddChild' | 'canAddSpouse' | 'canRemove' | 'hasChildren'>
  onSelect: (id: string | null) => void
  onOpenProfile: (id: string) => void
  onAction: (id: string, action: NodeAction) => void
}

const LABEL_X = -110
/** Dưới mức phóng này nút trong sơ đồ bị ẩn: giữ 44 px trên màn thì nút sẽ to hơn cả khung người. */
const MIN_ACTION_ZOOM = 0.5
/** Mức phóng nhỏ nhất khi tự căn ở cỡ gọn: khung còn ~140 px, chữ tên ~13 px. */
const COMPACT_MIN_ZOOM = 0.8

/** Nút thu phóng 44 px (thay bộ nút 26 px mặc định của React Flow), nằm trên vùng an toàn. */
function ZoomControls({ onFit }: { onFit: () => void }) {
  const rf = useReactFlow()
  const reduced = usePrefersReducedMotion()
  const duration = reduced ? 0 : 200
  return (
    <Panel position="bottom-left" style={{ marginLeft: 'max(12px, env(safe-area-inset-left))', marginBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="flex flex-col gap-2">
        <IconButton icon={ZoomIn} label="Phóng to" variant="secondary" onClick={() => void rf.zoomIn({ duration })} />
        <IconButton icon={ZoomOut} label="Thu nhỏ" variant="secondary" onClick={() => void rf.zoomOut({ duration })} />
        <IconButton icon={Maximize} label="Vừa khung" variant="secondary" onClick={onFit} />
      </div>
    </Panel>
  )
}

function Inner({ doc, layout, selectedId, highlightId, focusKey, showMiniMap, compact, actionsFor, onSelect, onOpenProfile, onAction }: DiagramProps) {
  const rf = useReactFlow()
  const reduced = usePrefersReducedMotion()
  // Nút trong sơ đồ giữ vùng chạm 44 px trên màn hình ở mọi mức phóng; thu dưới 50% thì ẩn (dùng bảng thông tin).
  const zoom = useStore((s) => s.transform[2])
  const persons = useMemo(() => new Map(doc.persons.map((p) => [p.id, p])), [doc])

  // Tách hai bước để bấm chọn không dựng lại cả nghìn khung: bước 1 chỉ phụ thuộc bố cục;
  // bước 2 chỉ thay đối tượng của đúng hai khung đổi trạng thái chọn/làm nổi.
  const baseNodes = useMemo(() => {
    const nodes: (PersonNode | LabelNode | JunctionNode)[] = []
    for (const r of layout.rows) {
      nodes.push({ id: `row:${r.generation}`, type: 'rowLabel', position: { x: LABEL_X, y: r.y + 24 }, data: { text: `Đời ${r.generation}` }, draggable: false, selectable: false, focusable: false })
    }
    for (const n of layout.nodes) {
      const person = persons.get(n.id)
      if (!person) continue
      nodes.push({
        id: n.id,
        type: 'person',
        position: { x: n.x, y: n.y },
        width: n.width,
        height: n.height,
        data: { person, hiddenCount: n.hiddenCount, collapsed: n.collapsed, selected: false, highlighted: false, onAction, ...actionsFor(person) },
        draggable: false,
      })
    }
    for (const j of layout.junctions) {
      nodes.push({ id: j.id, type: 'junction', position: { x: j.x, y: j.y }, data: {}, draggable: false, selectable: false, focusable: false })
    }
    return nodes
  }, [layout, persons, actionsFor, onAction])

  const nodes = useMemo(
    () =>
      baseNodes.map((n) =>
        n.type === 'person' && (n.id === selectedId || n.id === highlightId)
          ? { ...n, data: { ...n.data, selected: n.id === selectedId, highlighted: n.id === highlightId } }
          : n,
      ),
    [baseNodes, selectedId, highlightId],
  )

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map((e) =>
        e.type === 'marriage'
          ? { id: e.id, source: e.from, sourceHandle: 'r', target: e.to, targetHandle: 'l', type: 'straight', style: { stroke: 'var(--color-accent)', strokeWidth: 2 } }
          : { id: e.id, source: e.from, sourceHandle: 'b', target: e.to, targetHandle: 't', type: 'smoothstep', style: { stroke: 'var(--color-ink-muted)', strokeWidth: 2, ...edgeStyle[e.kind] } },
      ),
    [layout],
  )

  // Tự tính vừa khung từ bố cục (đã biết toạ độ, cỡ mọi khung) thay cho rf.fitView: fitView cần đo khung,
  // mà onlyRenderVisibleElements không vẽ (nên không đo) khung ngoài vùng nhìn.
  // Cỡ gọn: cây quá rộng thì giữ mức phóng đọc được và đặt người đầu cây ở giữa phía trên, người dùng kéo để xem tiếp.
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  const latest = useRef({ width, height, layout, compact, reduced })
  latest.current = { width, height, layout, compact, reduced }
  const hasSize = width > 0 && height > 0

  const rfRef = useRef(rf)
  rfRef.current = rf
  // Trạng thái căn khung, để test và kiểm tay biết khi nào sơ đồ đã đứng yên.
  const [fitState, setFitState] = useState<'pending' | 'animating' | 'done'>('pending')
  const fitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fit = useCallback(() => {
    const rf = rfRef.current
    const { width, height, layout, compact, reduced } = latest.current
    if (!width || !height) return
    const duration = reduced ? 0 : 250
    setFitState('animating')
    clearTimeout(fitTimer.current)
    fitTimer.current = setTimeout(() => setFitState('done'), duration + 60)
    const minX = LABEL_X
    const boundsW = layout.width - minX
    const boundsH = Math.max(layout.height, 1)
    const fitZoom = Math.min(1, (width * 0.88) / boundsW, (height * 0.88) / boundsH)
    const first = layout.nodes[0]
    if (compact && first && fitZoom < COMPACT_MIN_ZOOM) {
      const zoom = COMPACT_MIN_ZOOM
      void rf.setViewport({ x: width / 2 - (first.x + first.width / 2) * zoom, y: 32 - first.y * zoom, zoom }, { duration })
      return
    }
    const zoom = Math.max(fitZoom, 0.05)
    void rf.setViewport({ x: (width - boundsW * zoom) / 2 - minX * zoom, y: (height - boundsH * zoom) / 2, zoom }, { duration })
  }, [])

  // Căn lại khi đổi chế độ xem hoặc cỡ cửa sổ, không khi sửa cây hay khi mở/đóng ngăn thông tin
  // (khung dịch dưới con trỏ làm bấm đúp trượt, xem openspec/kb/tech-stack.md).
  useEffect(() => {
    if (!hasSize) return
    const t = setTimeout(fit, 30)
    return () => clearTimeout(t)
  }, [focusKey, compact, hasSize, fit])

  // Đưa sơ đồ tới người vừa tìm hoặc vừa thêm; giảm chuyển động thì nhảy thẳng.
  useEffect(() => {
    if (!highlightId) return
    const n = layout.nodes.find((x) => x.id === highlightId)
    if (!n) return
    const t = setTimeout(() => {
      const rf = rfRef.current
      const zoom = Math.min(1, Math.max(rf.getZoom(), COMPACT_MIN_ZOOM))
      void rf.setCenter(n.x + n.width / 2, n.y + n.height / 2, { zoom, duration: reduced ? 0 : 300 })
    }, 60)
    return () => clearTimeout(t)
  }, [highlightId, reduced, layout.nodes])

  return (
    <ReactFlow
      nodes={nodes as Node[]}
      edges={edges}
      nodeTypes={nodeTypes}
      onlyRenderVisibleElements
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      zoomOnDoubleClick={false}
      minZoom={0.05}
      maxZoom={1.5}
      onNodeClick={(_, n) => n.type === 'person' && onSelect(n.id)}
      onNodeDoubleClick={(_, n) => n.type === 'person' && onOpenProfile(n.id)}
      onPaneClick={() => onSelect(null)}
      proOptions={{ hideAttribution: true }}
      className={`bg-canvas ${zoom < MIN_ACTION_ZOOM ? 'kt-zoomed-out' : ''}`}
      style={{ ['--kt-zoom' as string]: zoom }}
      data-fit={fitState}
    >
      <Background color="var(--color-line)" gap={24} />
      <ZoomControls onFit={fit} />
      {showMiniMap && <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'person' ? 'var(--color-accent)' : 'transparent')} />}
    </ReactFlow>
  )
}

export function TreeDiagram(props: DiagramProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}

import { type ChildKind, type Layout, type TreeDoc, type TreePerson } from '@kintree/core'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { memo, useEffect, useMemo } from 'react'
import { lifespan } from '../lib/format.ts'

export type NodeAction = 'addParent' | 'addChild' | 'addSpouse' | 'remove' | 'toggleCollapse'

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

const hoverBtn =
  'hidden size-8 items-center justify-center rounded-full border border-line bg-white text-sm shadow hover:bg-[#f1ead9] group-hover:flex'

const PersonCard = memo(function PersonCard({ data }: NodeProps<PersonNode>) {
  const { person, hiddenCount, collapsed, selected, highlighted } = data
  const dead = person.death !== undefined
  const years = lifespan(person)
  return (
    <div className="group relative h-full w-full">
      <Handle id="t" type="target" position={Position.Top} className="!opacity-0" />
      <Handle id="l" type="target" position={Position.Left} className="!opacity-0" />
      <Handle id="r" type="source" position={Position.Right} className="!opacity-0" />
      <div
        className={[
          'flex h-full w-full cursor-pointer flex-col justify-center rounded-md border-2 bg-white px-3 text-center',
          dead ? 'border-dashed border-[#8a8175] bg-[#f3f0ea]' : 'border-seal',
          selected ? 'ring-4 ring-[#d9a441]' : '',
          highlighted ? 'animate-pulse ring-4 ring-[#d9a441]' : '',
        ].join(' ')}
        data-person-id={person.id}
      >
        <div className="truncate text-base font-semibold leading-tight" title={person.fullName}>
          {person.fullName}
        </div>
        <div className="truncate text-sm text-[#6b5d4a]">
          {years}
          {person.isOutsider ? `${years ? ' · ' : ''}${person.gender === 'male' ? 'rể' : 'dâu'}` : ''}
        </div>
        {collapsed && <div className="text-xs text-seal">{hiddenCount} người đang ẩn</div>}
      </div>

      <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-1">
        {data.canAddParent && (
          <button type="button" aria-label={`Thêm cha/mẹ cho ${person.fullName}`} className={hoverBtn} onClick={(e) => (e.stopPropagation(), data.onAction(person.id, 'addParent'))}>
            ↑
          </button>
        )}
      </div>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 gap-1">
        {data.canAddChild && (
          <button type="button" aria-label={`Thêm con cho ${person.fullName}`} className={hoverBtn} onClick={(e) => (e.stopPropagation(), data.onAction(person.id, 'addChild'))}>
            ↓
          </button>
        )}
        {data.hasChildren && (
          <button
            type="button"
            aria-label={collapsed ? `Mở nhánh của ${person.fullName}` : `Thu gọn nhánh của ${person.fullName}`}
            className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-base shadow hover:bg-[#f1ead9]"
            onClick={(e) => (e.stopPropagation(), data.onAction(person.id, 'toggleCollapse'))}
          >
            {collapsed ? '+' : '−'}
          </button>
        )}
      </div>
      <div className="absolute -right-4 top-1/2 flex -translate-y-1/2 flex-col gap-1">
        {data.canAddSpouse && (
          <button type="button" aria-label={`Thêm vợ/chồng cho ${person.fullName}`} className={hoverBtn} onClick={(e) => (e.stopPropagation(), data.onAction(person.id, 'addSpouse'))}>
            ♥
          </button>
        )}
      </div>
      <div className="absolute -right-3 -top-3">
        {data.canRemove && (
          <button type="button" aria-label={`Gỡ ${person.fullName}`} className={hoverBtn} onClick={(e) => (e.stopPropagation(), data.onAction(person.id, 'remove'))}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
})

const Junction = () => (
  <div className="size-px">
    <Handle id="b" type="source" position={Position.Bottom} className="!opacity-0" />
  </div>
)

const RowLabel = ({ data }: NodeProps<LabelNode>) => (
  <div className="pointer-events-none whitespace-nowrap text-lg font-semibold text-[#8a7a5c]">{data.text}</div>
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
  actionsFor: (p: TreePerson) => Pick<PersonData, 'canAddParent' | 'canAddChild' | 'canAddSpouse' | 'canRemove' | 'hasChildren'>
  onSelect: (id: string | null) => void
  onOpenProfile: (id: string) => void
  onAction: (id: string, action: NodeAction) => void
}

const LABEL_X = -150

function Inner({ doc, layout, selectedId, highlightId, focusKey, actionsFor, onSelect, onOpenProfile, onAction }: DiagramProps) {
  const rf = useReactFlow()
  const persons = useMemo(() => new Map(doc.persons.map((p) => [p.id, p])), [doc])

  // Tách thành hai bước để bấm chọn không dựng lại cả nghìn khung: bước 1 chỉ phụ thuộc bố cục;
  // bước 2 chỉ thay đối tượng của đúng hai khung đổi trạng thái chọn/làm nổi, các khung khác giữ nguyên.
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
          ? { id: e.id, source: e.from, sourceHandle: 'r', target: e.to, targetHandle: 'l', type: 'straight', style: { stroke: '#9b2c1f', strokeWidth: 2 } }
          : { id: e.id, source: e.from, sourceHandle: 'b', target: e.to, targetHandle: 't', type: 'smoothstep', style: { stroke: '#6b5d4a', strokeWidth: 2, ...edgeStyle[e.kind] } },
      ),
    [layout],
  )

  // Vừa khung khi đổi chế độ xem (thu gọn, xem riêng nhánh, đổi cuốn).
  useEffect(() => {
    const t = setTimeout(() => void rf.fitView({ padding: 0.15, duration: 250, maxZoom: 1 }), 30)
    return () => clearTimeout(t)
  }, [focusKey, rf])

  // Cuộn tới người vừa được chọn khi tìm kiếm hoặc vừa thêm.
  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => void rf.fitView({ nodes: [{ id: highlightId }], padding: 1.5, duration: 300, maxZoom: 1 }), 60)
    return () => clearTimeout(t)
  }, [highlightId, rf])

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
      fitView
      onNodeClick={(_, n) => n.type === 'person' && onSelect(n.id)}
      onNodeDoubleClick={(_, n) => n.type === 'person' && onOpenProfile(n.id)}
      onPaneClick={() => onSelect(null)}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#cdbfa6" gap={24} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'person' ? '#9b2c1f' : 'transparent')} />
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


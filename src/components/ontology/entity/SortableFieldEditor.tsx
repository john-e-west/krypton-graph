import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FieldEditor from './FieldEditor'
import type { EntityField } from '@/types/ontology'

interface SortableFieldEditorProps {
  id: string
  field: EntityField
  index: number
  onUpdate: (field: EntityField) => void
  onRemove: () => void
  isDragging: boolean
}

export default function SortableFieldEditor(props: SortableFieldEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FieldEditor {...props} />
    </div>
  )
}
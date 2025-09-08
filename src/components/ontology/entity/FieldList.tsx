import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import SortableFieldEditor from './SortableFieldEditor'
import type { EntityField } from '@/types/ontology'

interface FieldListProps {
  fields: EntityField[]
  onAdd: () => void
  onUpdate: (index: number, field: EntityField) => void
  onRemove: (index: number) => void
  onReorder: (fields: EntityField[]) => void
}

export default function FieldList({
  fields,
  onAdd,
  onUpdate,
  onRemove,
  onReorder
}: FieldListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((_, i) => `field-${i}` === active.id)
      const newIndex = fields.findIndex((_, i) => `field-${i}` === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(fields, oldIndex, newIndex)
        onReorder(newFields)
      }
    }
    
    setActiveId(null)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Fields</h3>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>
      
      {fields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No fields defined. Click "Add Field" to create one.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((_, i) => `field-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {fields.map((field, index) => (
                <SortableFieldEditor
                  key={`field-${index}`}
                  id={`field-${index}`}
                  field={field}
                  index={index}
                  onUpdate={(field) => onUpdate(index, field)}
                  onRemove={() => onRemove(index)}
                  isDragging={activeId === `field-${index}`}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
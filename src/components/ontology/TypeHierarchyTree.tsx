'use client'

import React from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, Hash, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TypeNode {
  id: string
  name: string
  type: 'entity' | 'edge' | 'attribute'
  description?: string
  children?: TypeNode[]
  metadata?: {
    count?: number
    confidence?: number
    required?: boolean
    dataType?: string
  }
}

interface TypeHierarchyTreeProps {
  nodes: TypeNode[]
  selectedNode?: string
  onNodeSelect?: (nodeId: string) => void
  onNodeReorder?: (nodes: TypeNode[]) => void
  className?: string
}

interface TreeNodeProps {
  node: TypeNode
  level: number
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onSelect: () => void
  onDragStart: (e: React.DragEvent, node: TypeNode) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, node: TypeNode) => void
  isDragging: boolean
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}) => {
  const hasChildren = node.children && node.children.length > 0
  
  const getIcon = () => {
    switch (node.type) {
      case 'entity':
        return hasChildren ? (
          isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
        ) : <File className="h-4 w-4" />
      case 'edge':
        return <Link2 className="h-4 w-4" />
      case 'attribute':
        return <Hash className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getTypeColor = () => {
    switch (node.type) {
      case 'entity':
        return 'text-blue-600'
      case 'edge':
        return 'text-purple-600'
      case 'attribute':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div
      className={cn(
        "select-none",
        isDragging && "opacity-50"
      )}
      draggable={node.type !== 'attribute'}
      onDragStart={(e) => onDragStart(e, node)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, node)}
    >
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors",
          isSelected ? "bg-primary/10" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={onSelect}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-4 w-4"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <span className={cn("mr-2", getTypeColor())}>
          {getIcon()}
        </span>
        
        <span className={cn(
          "text-sm font-medium",
          isSelected && "text-primary"
        )}>
          {node.name}
        </span>
        
        {node.metadata && (
          <div className="ml-auto flex items-center gap-2">
            {node.metadata.confidence !== undefined && (
              <Badge variant="outline" className="text-xs">
                {Math.round(node.metadata.confidence * 100)}%
              </Badge>
            )}
            {node.metadata.count !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {node.metadata.count}
              </Badge>
            )}
            {node.metadata.required && (
              <Badge variant="default" className="text-xs">
                Required
              </Badge>
            )}
            {node.metadata.dataType && (
              <Badge variant="outline" className="text-xs">
                {node.metadata.dataType}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypeHierarchyTree({
  nodes,
  selectedNode,
  onNodeSelect,
  onNodeReorder,
  className
}: TypeHierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())
  const [draggingNode, setDraggingNode] = React.useState<TypeNode | null>(null)

  React.useEffect(() => {
    const defaultExpanded = new Set<string>()
    const collectDefaultExpanded = (nodeList: TypeNode[]) => {
      nodeList.forEach(node => {
        if (node.children && node.children.length > 0) {
          defaultExpanded.add(node.id)
        }
      })
    }
    collectDefaultExpanded(nodes)
    setExpandedNodes(defaultExpanded)
  }, [nodes])

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleDragStart = (e: React.DragEvent, node: TypeNode) => {
    setDraggingNode(node)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetNode: TypeNode) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggingNode || draggingNode.id === targetNode.id) {
      setDraggingNode(null)
      return
    }

    if (draggingNode.type !== targetNode.type) {
      setDraggingNode(null)
      return
    }

    const reorderNodes = (nodeList: TypeNode[]): TypeNode[] => {
      const result: TypeNode[] = []
      let sourceNode: TypeNode | null = null
      
      for (const node of nodeList) {
        if (node.id === draggingNode.id) {
          sourceNode = node
          continue
        }
        
        if (node.id === targetNode.id && sourceNode) {
          result.push(sourceNode)
        }
        
        const newNode = { ...node }
        if (node.children) {
          newNode.children = reorderNodes(node.children)
        }
        result.push(newNode)
        
        if (node.id === targetNode.id && !sourceNode) {
          const found = findAndRemoveNode(nodeList, draggingNode.id)
          if (found) {
            result.push(found)
          }
        }
      }
      
      return result
    }

    const findAndRemoveNode = (nodeList: TypeNode[], nodeId: string): TypeNode | null => {
      for (let i = 0; i < nodeList.length; i++) {
        if (nodeList[i].id === nodeId) {
          return nodeList[i]
        }
        if (nodeList[i].children) {
          const found = findAndRemoveNode(nodeList[i].children, nodeId)
          if (found) return found
        }
      }
      return null
    }

    if (onNodeReorder) {
      const reordered = reorderNodes(nodes)
      onNodeReorder(reordered)
    }
    
    setDraggingNode(null)
  }

  const renderNode = (node: TypeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode === node.id
    
    return (
      <div key={node.id}>
        <TreeNode
          node={node}
          level={level}
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggle={() => toggleNode(node.id)}
          onSelect={() => onNodeSelect?.(node.id)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragging={draggingNode?.id === node.id}
        />
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <ScrollArea className={cn("h-[400px] rounded-md border", className)}>
      <div className="p-2">
        {nodes.map(node => renderNode(node))}
      </div>
    </ScrollArea>
  )
}
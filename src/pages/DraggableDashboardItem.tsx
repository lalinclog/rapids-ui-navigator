// src/components/dashboard/DraggableDashboardItem.tsx
import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface DraggableDashboardItemProps {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
  onMove: (id: number, x: number, y: number) => void;
  onResize: (id: number, width: number, height: number) => void;
  onRemove: (id: number) => void;
  isEditing: boolean;
}

const DraggableDashboardItem: React.FC<DraggableDashboardItemProps> = ({
  id,
  x,
  y,
  width,
  height,
  children,
  onMove,
  onResize,
  onRemove,
  isEditing,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'DASHBOARD_ITEM',
    item: { id, x, y },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: 'DASHBOARD_ITEM',
    drop: (item: { id: number; x: number; y: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newX = Math.max(0, x + Math.round(delta.x / 32));
        const newY = Math.max(0, y + Math.round(delta.y / 32));
        onMove(item.id, newX, newY);
      }
    },
  }));

  const handleResize = (e: any, { size }: { size: { width: number; height: number } }) => {
    onResize(id, Math.max(2, Math.round(size.width / 32)), Math.max(2, Math.round(size.height / 32)));
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      className="relative"
      style={{
        gridColumnStart: x + 1,
        gridColumnEnd: x + width + 1,
        gridRowStart: y + 1,
        gridRowEnd: y + height + 1,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
      }}
    >
      {isEditing ? (
        <Resizable
          width={width * 32}
          height={height * 32}
          onResize={handleResize}
          resizeHandles={['se']}
          minConstraints={[64, 64]}
          maxConstraints={[256, 256]}
        >
          <div style={{ width: '100%', height: '100%' }}>
            {children}
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />
          </div>
        </Resizable>
      ) : (
        children
      )}
    </div>
  );
};

export default DraggableDashboardItem;

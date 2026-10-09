import { useRef, useState, useCallback } from "react";

export function useSwipeToClose(onClose: () => void, threshold = 80) {
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragY > threshold) {
      onClose();
    }
    setDragY(0);
    startY.current = null;
  }, [dragY, threshold, onClose]);

  return { dragY, onTouchStart, onTouchMove, onTouchEnd };
}

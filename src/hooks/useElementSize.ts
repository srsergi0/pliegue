import { useEffect, useRef, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks the content-box size of an element with a ResizeObserver.
 * Used to size the preview sheet so it always fits the available space.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

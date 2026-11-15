import { useEffect, useState } from 'react';

// Skala kanvas untuk halaman publik: kanvas didesain di lebar tetap (mis. 1440px)
// lalu diperkecil/diperbesar proporsional mengikuti lebar layar.
export function useViewportScale(canvasWidth, max = 1.5) {
  const compute = () => Math.min(max, (document.documentElement.clientWidth || window.innerWidth) / canvasWidth);
  const [scale, setScale] = useState(compute);

  useEffect(() => {
    const onResize = () => setScale(compute());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, max]);

  return scale;
}

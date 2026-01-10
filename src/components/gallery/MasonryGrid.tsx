"use client";

import Masonry from "react-masonry-css";
import { SmartImage } from "@/once-ui/components";
import styles from "./Gallery.module.scss";
import { gallery } from "@/app/resources/content";
import { useState, useEffect, useRef } from "react";

export default function MasonryGrid() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);   // ← añade esta
  const [endX, setEndX] = useState(0);       // ← y esta
  const [scale, setScale] = useState(1);                // controla el nivel de zoom
  const [position, setPosition] = useState({ x: 50, y: 50 }); // punto desde donde se hace zoom
  const imageRef = useRef<HTMLImageElement>(null);      // referencia directa a la etiqueta <img>

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const nextImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev !== null ? (prev + 1) % gallery.images.length : 0));
    }
  };

  const prevImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev !== null ? (prev - 1 + gallery.images.length) % gallery.images.length : 0));
    }
  };

  // Cerrar con tecla Esc y navegar con flechas
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") nextImage();
    else if (e.key === "ArrowLeft") prevImage();
  };

  if (selectedIndex !== null) {
    document.body.style.overflow = 'hidden'; // bloquea scroll del fondo
  } else {
    document.body.style.overflow = '';
    setScale(1);               // ← resetea zoom a 1x
    setPosition({ x: 50, y: 50 }); // ← centra el punto de origen
  }

  // Bloquear zoom táctil
  if (selectedIndex !== null) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // 👈 clave: desactiva pinch-to-zoom
    window.addEventListener('touchmove', preventZoom, { passive: false });
  } else {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    window.removeEventListener('touchmove', preventZoom);
  }

  window.addEventListener('keydown', handleKeyDown);

  // Zoom con Ctrl + scroll (escritorio)
  const handleWheel = (e: WheelEvent) => {
    if (!imageRef.current || selectedIndex === null) return;
    if (!e.ctrlKey && !e.metaKey) return; // solo si se presiona Ctrl (Windows/Linux) o Cmd (Mac)

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);

    // Calcular posición del cursor relativa a la imagen
    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const x = (offsetX / rect.width) * 100;
    const y = (offsetY / rect.height) * 100;
    setPosition({ x, y });
  };

  window.addEventListener('wheel', handleWheel, { passive: false });

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('touchmove', preventZoom);
    window.removeEventListener('wheel', handleWheel);
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  };

}, [selectedIndex]);

  const breakpointColumnsObj = {
    default: 4,
    1440: 3,
    1024: 2,
    560: 1,
  };

  const currentImage = selectedIndex !== null ? gallery.images[selectedIndex] : null;

  // Evita el zoom táctil en el lightbox
const preventZoom = (e: TouchEvent) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
};

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className={styles.masonryGrid}
        columnClassName={styles.masonryGridColumn}
      >
        {gallery.images.map((image, index) => (
          <div
            key={index}
            className={styles.gridItemWrapper}
            onClick={() => openLightbox(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLightbox(index);
              }
            }}
            aria-label={`Ver imagen ampliada: ${image.alt}`}
          >
            <SmartImage
              priority={index < 15}
              sizes="(max-width: 560px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
              radius="m"
              aspectRatio={
                image.orientation === "horizontal"
                  ? "16 / 9"
                  : image.orientation === "vertical"
                  ? "9 / 16"
                  : "1 / 1"
              }
              src={image.src}
              alt={image.alt}
              className={styles.gridItem}
            />
          </div>
        ))}
      </Masonry>

      {/* Lightbox con carrusel */}
      {selectedIndex !== null && currentImage && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          {/* Flecha izquierda */}
          <button
            className={`${styles.navButton} ${styles.navButtonLeft}`}
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Imagen anterior"
          >
            ‹
          </button>

          {/* Contenido central */}
          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              setEndX(e.changedTouches[0].clientX);
              const diff = startX - endX;
              if (Math.abs(diff) > 50) {
                if (diff > 0) nextImage(); // deslizar izquierda → siguiente
                else prevImage();          // deslizar derecha → anterior
              }
            }}
          >
            <img
              ref={imageRef}
              src={currentImage.src}
              alt={currentImage.alt}
              className={styles.lightboxImage}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: `${position.x}% ${position.y}%`,
                transition: 'transform 0.1s ease',
              }}
              onDoubleClick={() => {
                setScale(scale === 1 ? 2 : 1);
                setPosition({ x: 50, y: 50 });
              }}
            />
            <div className={styles.imageCounter}>
              {selectedIndex + 1} de {gallery.images.length}
            </div>
          </div>

          {/* Flecha derecha */}
          <button
            className={`${styles.navButton} ${styles.navButtonRight}`}
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            aria-label="Siguiente imagen"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
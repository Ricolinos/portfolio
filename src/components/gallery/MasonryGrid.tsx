"use client";

import Masonry from "react-masonry-css";
import { SmartImage } from "@/once-ui/components";
import styles from "./Gallery.module.scss";
import { gallery } from "@/app/resources/content";
import { useState, useEffect } from "react";

export default function MasonryGrid() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "ArrowLeft") {
        prevImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  const breakpointColumnsObj = {
    default: 4,
    1440: 3,
    1024: 2,
    560: 1,
  };

  const currentImage = selectedIndex !== null ? gallery.images[selectedIndex] : null;

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
            className={styles.navButton}
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Imagen anterior"
          >
            ‹
          </button>

          {/* Contenido central */}
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className={styles.lightboxImage}
            />
            {/* Indicador: "1 de 21" */}
            <div className={styles.imageCounter}>
              {selectedIndex + 1} de {gallery.images.length}
            </div>
          </div>

          {/* Flecha derecha */}
          <button
            className={styles.navButton}
            style={{ right: "24px" }}
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

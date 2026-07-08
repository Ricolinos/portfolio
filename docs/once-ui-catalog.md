# Catálogo Once-UI — qué componente usar para cada caso

> **Todo se importa desde `@once-ui-system/core`.** No hay que copiar archivos: el paquete
> instalado (`^1.7.12`) ya incluye Components, Form Controls, Effects, **Modules** (MegaMenu,
> Kbar, CodeBlock, etc.), Context providers y Charts. Un componente que no importas **no pesa**
> en el bundle publicado (tree-shaking). Importa siempre por nombre desde el paquete:
>
> ```tsx
> import { Button, Flex, Column, Dialog, RevealFx, CodeBlock } from "@once-ui-system/core";
> ```
>
> Docs oficiales: https://docs.once-ui.com — consúltalas para props exactas antes de usar.

---

## 1. Layout / estructura
| Componente | Cuándo usarlo |
|---|---|
| `Flex` | Contenedor flexbox genérico (base de casi todo el layout). |
| `Row` / `Column` | Atajos de `Flex` con dirección fija (fila / columna). Prefiérelos por legibilidad. |
| `Grid` | Rejilla CSS con columnas/filas y gap por tokens. |
| `MasonryGrid` | Rejilla tipo Pinterest (alturas irregulares) — galerías, portafolio. |
| `Card` | Bloque contenedor con borde/fondo/elevación. |
| `Line` | Separador (divider) horizontal o vertical. |
| `Background` | Fondo decorativo (gradientes, grid, dots) a nivel sección/página. |
| `Mask` | Recorta/degrada el contenido con máscara (fade en bordes). |
| `ElementType` | Renderiza el tag/elemento correcto (polimórfico) — uso interno/avanzado. |

## 2. Tipografía y texto
| Componente | Cuándo usarlo |
|---|---|
| `Heading` | Títulos (h1–h6) con escala tipográfica del tema. |
| `Text` | Párrafos y texto en general. |
| `BlockQuote` | Citas destacadas. |
| `InlineCode` | Código en línea dentro de un párrafo. |
| `Kbd` | Representa una tecla (`⌘K`, `Esc`). |
| `List` | Listas con estilo del sistema. |
| `SmartLink` | Enlace inteligente (interno/externo, prefetch, estados). Úsalo en vez de `<a>`. |
| `Tag` | Etiqueta/pill de categoría o metadato. |
| `Badge` | Indicador numérico o de estado sobre otro elemento. |

## 3. Acciones / botones
| Componente | Cuándo usarlo |
|---|---|
| `Button` | Acción principal/secundaria con variantes. |
| `IconButton` | Acción representada solo por ícono. |
| `ToggleButton` | Botón de estado on/off o selección en grupo (nav, tabs simples). |
| `SegmentedControl` | Selector segmentado de opciones mutuamente excluyentes. |
| `Chip` | Selección filtrable/removible (filtros, tags interactivos). |
| `Arrow` | Flecha decorativa/direccional (CTAs, carruseles). |

## 4. Formularios / inputs
| Componente | Cuándo usarlo |
|---|---|
| `Input` | Texto de una línea. |
| `Textarea` | Texto multilínea. |
| `PasswordInput` | Contraseña con toggle de visibilidad. |
| `NumberInput` | Numérico con steppers. |
| `OTPInput` | Código de verificación (2FA, códigos). |
| `Select` | Selección de una opción de lista. |
| `Option` | Item individual dentro de `Select`/dropdowns. |
| `Checkbox` | Booleano / selección múltiple. |
| `RadioButton` | Una opción entre varias. |
| `Switch` | Toggle booleano de ajuste. |
| `Slider` | Valor en un rango. |
| `TagInput` | Input que produce múltiples tags. |
| `ColorInput` | Selección de color. |
| `DateInput` / `DatePicker` | Fecha (campo / calendario). |
| `DateRangeInput` / `DateRangePicker` | Rango de fechas. |
| `EmojiPicker` / `EmojiPickerDropdown` | Selección de emoji. |
| `Feedback` | Mensaje de validación/estado bajo un campo o formulario. |

## 5. Overlays / popovers
| Componente | Cuándo usarlo |
|---|---|
| `Dialog` | Modal centrado (confirmaciones, formularios). |
| `Dropdown` / `DropdownWrapper` | Menú desplegable anclado a un trigger. |
| `ContextMenu` | Menú contextual (click derecho / acciones sobre item). |
| `HoverCard` | Tarjeta que aparece al hover (previews de perfil/enlace). |
| `Tooltip` | Texto breve informativo al hover/focus. |
| `CursorCard` | Tarjeta que sigue al cursor. |
| `StyleOverlay` / `StylePanel` | Panel para editar tema/estilos en vivo (theming). |

## 6. Navegación (Modules)
| Componente | Cuándo usarlo |
|---|---|
| `MegaMenu` | Menú de navegación amplio con secciones (desktop). |
| `MobileMegaMenu` | Equivalente para móvil. |
| `Kbar` | Paleta de comandos ⌘K (búsqueda/acciones rápidas). |
| `HeadingNav` | Tabla de contenido que sigue los headings (docs/blog largo). |
| `NavIcon` | Ícono de navegación (hamburguesa animada, etc.). |
| `UserMenu` | Menú de usuario (avatar + acciones de cuenta). |

> Nota: `src/components/MegaMenu.tsx` es una versión hecha a mano previa. Ahora `MegaMenu`
> viene en el paquete — considera migrar al del paquete si quieres mantener menos código.

## 7. Feedback / estado
| Componente | Cuándo usarlo |
|---|---|
| `Banner` | Aviso a lo ancho (info/promoción/alerta de página). |
| `Feedback` | Mensaje inline de éxito/error/aviso. |
| `Spinner` | Cargando (indeterminado). |
| `ProgressBar` | Progreso determinado (%). |
| `Skeleton` | Placeholder de carga (shimmer). |
| `StatusIndicator` | Punto de estado (online/offline/ocupado). |
| `Pulse` | Animación de pulso para llamar atención. |
| `ToastProvider` | Provider para toasts (notificaciones efímeras). |

## 8. Media / imagen
| Componente | Cuándo usarlo |
|---|---|
| `Media` | Imagen/video optimizado del sistema (usar en vez de `<img>`). |
| `Avatar` / `AvatarGroup` | Foto de usuario / grupo apilado. |
| `User` | Bloque avatar + nombre + rol. |
| `Logo` / `LogoCloud` | Logo / grid de logos (clientes, marcas). |
| `Icon` | Ícono (react-icons via IconProvider). |
| `OgCard` | Tarjeta de previsualización de enlace (Open Graph). |
| `CompareImage` | Slider antes/después de dos imágenes (Module). |
| `MediaUpload` | Zona de subida de archivos con preview (Module). |

## 9. Colecciones / scroll
| Componente | Cuándo usarlo |
|---|---|
| `Carousel` / `Swiper` | Slider de items con navegación. |
| `Scroller` | Contenedor con scroll horizontal controlado. |
| `AutoScroll` | Marquee / scroll automático continuo (logos, testimonios). |
| `InfiniteScroll` | Carga incremental al llegar al final. |
| `Accordion` / `AccordionGroup` | Secciones colapsables (FAQ). |
| `Timeline` | Línea de tiempo (historial, proceso). |
| `Table` | Tabla de datos. |

## 10. Charts (dataviz)
> Ver también el skill `dataviz` antes de construir gráficas.

`BarChart`, `LineChart`, `PieChart`, `LineBarChart`, `RadialGauge`, `LinearGauge`,
`ChartHeader`, `ChartStatus`, `Legend`, `DataTooltip`, `LinearGradient`, `RadialGradient`.

## 11. Efectos / motion
Envuelven contenido para animarlo o darle un efecto visual. Úsalos con moderación.

| Efecto | Para qué |
|---|---|
| `RevealFx` | Aparición al entrar en viewport (fade/slide) — hero, secciones. |
| `Fade` | Fundido simple. |
| `TiltFx` | Inclinación 3D al mover el cursor sobre una tarjeta. |
| `HoloFx` | Brillo holográfico (tarjetas premium). |
| `ShineFx` | Destello al hover. |
| `GlitchFx` | Efecto glitch. |
| `LetterFx` | Animación letra por letra (decodificado). |
| `TypeFx` | Efecto máquina de escribir. |
| `FlipFx` | Volteo de cara A/B. |
| `CountFx` | Conteo animado de un número (métricas). |
| `CountdownFx` | Cuenta regresiva. |
| `CelebrationFx` | Confeti/celebración (éxito, conversión). |
| `MatrixFx` | Lluvia estilo Matrix. |
| `WeatherFx` | Efecto de clima (lluvia/nieve). |
| `Animation` / `Hover` / `Pulse` / `Particle` | Primitivas de animación/hover/partículas. |

## 12. Tema / theming
| Componente | Cuándo usarlo |
|---|---|
| `ThemeSwitcher` | Toggle claro/oscuro listo para usar. |
| `StylePanel` / `StyleOverlay` | Panel de personalización de tema en vivo. |

## 13. SEO (Modules)
| Componente | Cuándo usarlo |
|---|---|
| `Meta` | Genera `<meta>` / Open Graph desde datos (helper, no visual). |
| `Schema` | Genera JSON-LD structured data (SEO). |

## 14. Context providers (envolver la app)
En `layout.tsx` / `Providers.tsx`:
`LayoutProvider`, `ThemeProvider`, `DataThemeProvider`, `IconProvider`, `ToastProvider`.

---

### Regla de decisión rápida
1. ¿Existe ya en Once-UI? → úsalo (evita reinventar). Busca aquí por *caso de uso*.
2. Importa por nombre desde `@once-ui-system/core`.
3. Estiliza con **tokens** del tema (no colores/hardcode) para que respete claro/oscuro.
4. Solo crea componente propio si combinas varios de estos o no existe equivalente.

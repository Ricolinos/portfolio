# ESPECIFICACIÓN DE OPTIMIZACIÓN GLOBAL Y REFACTORIZACIÓN DE MÓDULOS (HUB-NERDS)

## 1. OBJETIVO GENERAL
Ejecutar una reestructuración integral del ecosistema Hub-Nerds que abarca la unificación de elementos de interfaz globales, la optimización funcional del constructor de casos de estudio MDX, la normalización de flujos y estados en los dashboards de Clientes y Partners, y la adición de capacidades avanzadas de visualización de datos en el gestor de proyectos, operando exclusivamente bajo las primitivas y fichas de tokens del sistema de diseño Once UI.

## 2. REAJUSTES GLOBALES Y ARQUITECTURA BASE (SITE-WIDE)

### 2.1 Ecosistema del Header y MegaMenu
- **Badge de Estado ("Beta"):** Inyectar un componente `Badge` con un efecto visual destacado conteniendo el string "Beta", posicionado de forma adyacente o sutilmente superpuesto en el extremo de la marca/logo principal, garantizando que el flujo flex y el comportamiento interactivo del MegaMenu subyacente permanezcan inalterados.
- **Depuración del MegaMenu:** Localizar y remover por completo el componente o la barra de búsqueda exclusivamente dentro del contenedor del MegaMenu en todas las vistas de la aplicación.

### 2.2 Componente de Interacción Flotante Global (Burbuja Flotante)
- **Matriz de Acceso:** Restringir el ciclo de vida y renderizado del componente flotante únicamente a sesiones donde el estado de autenticación (Clerk) sea válido (ocultar a usuarios visitantes anónimos).
- **Cinemática y Layout:** Implementar transiciones fluidas de imantación elástica hacia los extremos laterales del viewport. La caja de colisiones debe confinarse a los márgenes izquierdo y derecho de la pantalla, respetando de forma estricta el límite inferior del Header para evitar solapamientos. El tema cromático debe heredar dinámicamente los tokens globales del sistema.

### 2.3 Consistencia en Estados de Carga
- Envolver las transiciones de rutas y componentes asíncronos en componentes `Skeleton` nativos de Once UI, mitigando el parpadeo visual y asegurando estabilidad estructural durante el fetching de datos.

## 3. REFACTORIZACIÓN DEL PANEL DE CLIENTE

### 3.1 Pipeline Interactivo "Nuevo Proyecto"
- **Consolidación de Controles:** Eliminar el botón disparador redundante de menor escala y transferir la interactividad al panel contenedor principal de creación.
- **Buscador de Categorías:** Transformar el panel en un formulario predictivo donde el cliente seleccione la vertical raíz (ENUM: [DISEÑO, ANIMACIÓN, ILUSTRACIÓN]) y, tras accionar el comando "Agregar", se desplieguen dinámicamente las subcategorías o ramificaciones correspondientes (Branding, Logo, etc.).
- **Limpieza de UI:** Eliminar definitivamente la tarjeta e interfaz de "Buscar talento" del lienzo del dashboard.

### 3.2 Unificación y Gestión de Proyectos en Curso
- **Fusión de Módulos:** Unificar las secciones "Proyectos en colaboración" y "En curso" en un único bloque modular denominado "Proyectos en curso".
- **Homologación de Máquina de Estados:** Limitar estrictamente las etiquetas de estado del proyecto a los valores: `EN_PROGRESO`, `EN_PAUSA`, `PENDIENTE_APROBACION`, `COMPLETADO`.
- **Despliegue de Tareas Integradas:** Incorporar un botón interactivo por fila de proyecto para expandir horizontal o verticalmente un contenedor hijo con la lista de tareas activas del proyecto, las cuales deben incluir sus propios marcadores de estado.
- **Buscador Interno de Colaboradores:** Modificar el comportamiento del trigger "Buscar más talento"; se debe suprimir la redirección externa a `/explorar/designerds` y en su lugar instanciar un Modal/Ventana emergente de búsqueda idéntico al componente utilizado en el gestor de proyectos internos para la adición de colaboradores.

## 4. REFACTORIZACIÓN DEL PANEL DE COLABORADOR (PARTNER) Y MATRIZ DE ROLES

### 4.1 Reordenamiento Minimalista
- Sustituir el input de selección estructural para el ordenamiento de tarjetas por el componente `Arrow` de Once UI configurado en modo "Simple usage" (sin contenedor de fondo). Al activarse, debe desplegar un menú contextual (`Dropdown`) con el ancho mínimo restrictivo para contener sus respectivos iconos y cadenas de texto explicativas.

### 4.2 Optimización Táctil (Mobile UX)
- Auditar y reescribir la directiva de detección de gestos táctiles para el panel administrativo de proyectos, garantizando que el evento de pulsación prolongada (*long press*) se ejecute de manera consistente en entornos móviles y tabletas.

### 4.3 Arquitectura Poligonal de Roles
- **Modal de Perfil:** En la sección general del formulario de edición de perfil, estructurar controles selectores para establecer un "Rol Principal" y hasta un máximo estricto de dos "Roles Secundarios".
- **Visualización mediante Badges:** Renderizar las designaciones en el perfil utilizando componentes `Badge` diferenciados. El Rol Principal debe poseer un token cromático con un efecto visual de alta jerarquía, mientras que los secundarios se mantendrán en un estado neutro.
- **Sincronización de Tarjetas:** Extender este esquema de visualización con insignias primarias y secundarias a los componentes de tarjeta que se listan en la ruta pública `/explorar/designerds`.

## 5. OPTIMIZACIÓN DEL CONSTRUCTOR MDX (CASOS DE ESTUDIO)

### 5.1 Control de Espacio en Canvas
- Añadir a cada bloque inyectado en el editor la capacidad de colapsarse/minimizarse de forma individual para optimizar la navegación vertical dentro del canvas de edición.

### 5.2 Mecánicas Drag-and-Drop (Arrastrar y Soltar)
- **Reordenamiento Interno:** Implementar soporte interactivo de arrastre en el árbol de bloques agregados para permitir la reordenación posicional fluida en el canvas.
- **Instanciación Directa:** Habilitar la capacidad de arrastrar los iconos de herramientas desde el panel lateral derecho ("Añadir sección") y soltarlos directamente sobre la superficie del canvas para instanciar automáticamente el nodo del bloque correspondiente.

## 6. EVOLUCIÓN DEL GESTOR DE PROYECTOS Y DATA VIZ

### 6.1 Identidad del Proyecto
- Añadir soporte en base de datos (Prisma/Supabase) y almacenamiento para un atributo de imagen corporativa o logotipo por cada entidad de proyecto, facilitando su renderizado compacto en el panel para una identificación rápida.

### 6.2 Visualización de Datos Avanzada en Tareas
- **Linear Gauge:** Integrar el componente `LinearGauge` de Once UI para proyectar de forma lineal e intuitiva los porcentajes y métricas de avance de las tareas en tiempo real.
- **Manejo de Tiempos Extendido:** Acoplar selectores de fecha avanzados (`DatePicker` / `DateRangePicker`) provistos por la librería de control de formularios de Once UI.
- **Enriquecimiento del Esquema de Tareas:** Trascender los tipos primitivos (Booleanos). El agente debe extender el modelo de datos para dotar a las tareas de atributos operacionales complejos como niveles de prioridad, jerarquía de dependencias cruzadas entre tareas, categorizaciones personalizadas y sugerencias inteligentes de asignación.

### 6.3 Secciones Complementarias del Dashboard (Común)
- **Novedades (Changelog):** Módulo estructurado para renderizar cronológicamente los logs de cambios y optimizaciones de la plataforma.
- **Panel de Notificaciones:** Centro de notificaciones unificado para el consumo de eventos del sistema.
- **Hero Institucional:** Banner de bienvenida y fidelización dinámico adaptado según el rol del usuario logueado.

## 7. FLUJO SECUENCIAL DE EJECUCIÓN DEL SUPERVISOR
1. **Fase 1 (DB & Schema):** Modificar `schema.prisma` para soportar el almacenamiento de logos de proyectos, la matriz de rol primario/secundario y los atributos ricos de tareas. Generar la migración y actualizar Supabase.
2. **Fase 2 (Layout Global):** Intervenir el layout raíz, el Header (Badge Beta y remoción del input del MegaMenu), la lógica global de la burbuja flotante reactiva al auth y las transiciones con `Skeleton`.
3. **Fase 3 (Dashboard Cliente):** Refactorizar el panel de proyecto interactivo, unificar los bloques a "Proyectos en curso" con filas expandibles e integrar la ventana modal de búsqueda de colaboradores.
4. **Fase 4 (Dashboard Partner):** Reemplazar el input de ordenamiento por el componente `Arrow`, corregir los gestos de pantalla táctil y acoplar el sistema de badges primario/secundario replicándolo en `/explorar/designerds`.
5. **Fase 5 (Constructor MDX):** Programar las funciones de minimización de paneles y las mecánicas drag-and-drop del canvas de edición.
6. **Fase 6 (Data Viz de Proyectos):** Instanciar el componente `LinearGauge`, los inputs de calendario compuesto y el motor enriquecido de gestión de tareas.
7. **Fase 7 (Verificación Estática):** Compilar la totalidad de la aplicación mediante el compilador de TypeScript (`tsc`) y ejecutar el Linter para certificar que el repositorio no presenta errores.
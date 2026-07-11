# ESPECIFICACIÓN DE REFACTORIZACIÓN: SISTEMA DE MENSAJERÍA CENTRALIZADO (ESTILO MESSENGER)

## 1. OBJETIVO GENERAL
Migrar y unificar la lógica de comunicación de Hub-Nerds en una vista maestra en `/src/app/mensajes/page.tsx`. La interfaz debe replicar la distribución estructural de tres paneles laterales del modelo Messenger de Meta, utilizando exclusivamente las primitivas de distribución estructural y tokens de espaciado nativos de Once UI.

## 2. ARQUITECTURA DE LA INTERFAZ (LAYOUT FLUIDO DE 3 PANELES)
El contenedor raíz en `page.tsx` debe configurarse como un layout de pantalla completa sin desbordamiento externo, delegando la gestión del ancho y escalado a las propiedades flex y grid de Once UI:

### 2.1 Panel Izquierdo: Bandeja de Entrada e Hilos
- **Dimensionamiento:** Configurar con un ancho relativo porcentual menor o mediante los tokens de tamaño de layout ajustados para barras laterales del sistema Once UI.
- **Cabecera:** Título de sección "Chats" y utilidades globales (Menú de opciones, Botón para nueva conversación).
- **Barra de Búsqueda:** Componente Input predictivo de Once UI para filtrado de hilos.
- **Segmentación por Píldoras (Pill Tabs):** Control interactivo superior con los filtros: [Todos, No leídos, Grupos].
- **Lista de Hilos (Thread List):** Área con scroll independiente. Cada elemento debe utilizar el componente de lista nativo con `Avatar` (con indicador de estado), nombre del emisor, fragmento del último mensaje, marca de tiempo y indicador de mensajes no leídos.

### 2.2 Panel Central: Ventana de Conversación Activa
- **Dimensionamiento:** Configurar con comportamiento flexible de expansión (`flex-grow`) para ocupar el espacio restante dinámicamente.
- **Cabecera de Hilo:** Nombre de la entidad (Usuario o Grupo), avatar e iconos de acción en el extremo opuesto (Llamada, Video, e Icono de Información que conmuta la visibilidad del Panel Derecho).
- **Flujo Cronológico (Message Stream):** Región central con scroll automatizado. Los componentes de globos de texto (Message Bubbles) deben alinearse de forma asimétrica según el emisor y receptor utilizando los tokens de color del sistema de diseño. Debe soportar la renderización de elementos multimedia integrados.
- **Consola de Entrada (Footer):** Barra inferior fija que agrupa las utilidades de adjuntos, el Input de texto y el accionador de envío.

### 2.3 Panel Derecho: Metadatos del Chat y Gestión de Proyectos
- **Dimensionamiento:** Configurar con un ancho relativo porcentual o token de layout lateral complementario. Debe soportar estados de visibilidad condicional (colapsable/desplegable).
- **Bloque de Perfil Central:** Avatar a escala del sistema, Nombre del contacto/Grupo y metadata del proyecto.
- **Acciones Rápidas:** Fila de componentes de botones minimalistas.
- **Menús Desplegables Estilo Acordeón (Once UI Accordion):**
  - *Información del chat:* Detalles del canal o información del perfil.
  - *Roles del Proyecto (Exclusivo vista Grupo):* Lista de participantes ordenados y segmentados jerárquicamente por su rol de proyecto activo (ENUM: [PLANNER, REALIZADOR, DESIGNER, EDITOR]).
  - *Gestión de Tareas (Feature Clave):* Lista de tareas vinculadas al proyecto. Incluye el desencadenador para mutar un mensaje a tarea y fijar fechas de entrega (deadlines).
  - *Multimedia y archivos:* Rejilla compacta de imágenes y enlaces compartidos.
  - *Privacidad y ayuda:* Opciones de bloqueo o abandono de sala.

## 3. LÓGICA DE CONTROL DE ACCESO (ACL) Y PRIVACIDAD
- **Inicialización de Conversación 1-a-1:** Los usuarios con rol 'Client' tienen la facultad exclusiva de iniciar una conversación con un 'Partner'. Los usuarios 'Partner' tienen denegada la inicialización de hilos hacia 'Client' a menos que exista un registro previo en la base de datos Supabase.
- **Persistencia de Roles en Grupos:** Los hilos catalogados como 'Grupos' pertenecen obligatoriamente a un proyecto. El 'Client' retiene los permisos administrativos sobre el grupo para dar de alta salas o modular la matriz de roles de los colaboradores asignados.

## 4. INSTRUCCIONES DE DESTRUCCIÓN Y LIMPIEZA
El supervisor debe encargarse de borrar o desacoplar por completo cualquier lógica de mensajería inline previamente inyectada en los Dashboards del cliente o del partner individuales, redirigiendo todos los flujos mediante Next.js `Link` o router pushes hacia la ruta centralizada `/mensajes`.

## 5. FLUJO DE EJECUCIÓN SECUENCIAL PARA EL SUPERVISOR
1. **Fase 1:** Limpieza de interfaces obsoletas de chat en los dashboards perimetrales.
2. **Fase 2:** Maquetar la estructura de la página `/src/app/mensajes/page.tsx` montando el layout tricolumna usando las primitivas estructurales de Once UI.
3. **Fase 3:** Consumir los endpoints y Server Actions de Prisma para mapear la bandeja de entrada según los filtros (Todos, No leídos, Grupos).
4. **Fase 4:** Construir el pipeline interactivo para pintar el flujo cronológico de mensajes, adjuntos y la lógica de acordeones operativos en el Panel Derecho.
5. **Fase 5:** Validar el tipado estricto con el compilador de TypeScript y formatear para garantizar cero errores de ejecución.
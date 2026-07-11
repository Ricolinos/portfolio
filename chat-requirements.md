# ESPECIFICACIÓN TÉCNICA: ARQUITECTURA DEL SISTEMA DE MENSAJERÍA E INTEGRACIÓN DE TAREAS

## 1. OBJETIVO GENERAL
Implementar un subsistema dual de comunicación asíncrona y en tiempo real (Mensajería Light y Mensajería Robusta) integrado con el gestor de proyectos actual de Hub-Nerds, permitiendo la mutación de mensajes a entidades de tareas dentro de la base de datos.

## 2. RESTRICCIONES REQUISITOS DE DISEÑO INTERFAZ (UI-ONCE)
- CUMPLIMIENTO ESTRICTO: Todos los componentes visuales deben ser importados y extendidos exclusivamente desde el ecosistema nativo de Once UI.
- VALIDACIÓN MCP: El agente ui-once debe validar cada propiedad, token de diseño y jerarquía estructural utilizando el servidor MCP de Once UI en línea. Queda estrictamente prohibido el uso de librerías de componentes externas o estilos CSS personalizados inline que rompan el sistema de diseño global.

## 3. MODELADO DE DATOS Y REGLAS DE NEGOCIO (DATA-PRISMA)
El agente de datos debe modificar el esquema de Prisma y asegurar la integridad referencial en Supabase bajo los siguientes criterios:

### 3.1 Subsistema de Mensajería Light (Prospección y Enlace)
- Restricción de Acceso Unidireccional: Los usuarios con rol 'Client' (perfiles privados) son los únicos autorizados para inicializar hilos de conversación con usuarios con rol 'Partner'. 
- Restricción 'Partner': Un 'Partner' tiene prohibido instanciar una conversación con un 'Client'. Solo podrá responder si existe un registro previo de conversación iniciado por dicho 'Client'.
- Comunicación Horizontal: Se permite la creación de hilos bidireccionales directos entre usuarios 'Partner' <-> 'Partner'.

### 3.2 Subsistema de Mensajería Robusta (Gestor Colaborativo de Proyecto)
- Dependencia de Entidad: Este módulo solo es accesible si el estado del proyecto relacionado es igual a 'ACTIVE'.
- Jerarquía de Canales: Relación de uno a muchos (1:N) entre la entidad 'Project' y la entidad 'Room/Channel'. El creador del proyecto ('Client') posee privilegios de administrador para instanciar, modificar y destruir estos canales.
- Matriz de Roles del Proyecto: Implementar una relación poligonal o tabla intermedia para asignar roles específicos a los 'Partners' dentro de un proyecto. Los roles permitidos son un ENUM: [PLANNER, REALIZADOR, DESIGNER, EDITOR]. Un 'Partner' puede almacenar múltiples roles simultáneamente dentro del mismo proyecto. El 'Client' es la única entidad autorizada para asignar o modificar esta matriz de roles.

### 3.3 Extracción y Mutación de Mensajes a Tareas (Message-to-Task Pipeline)
- Modelo de Datos: La entidad 'Message' debe permitir una relación opcional (0:1) o mapeo hacia la entidad 'Task'.
- Máquina de Estados de la Tarea:
  - Al instanciarse desde un mensaje del chat, el estado inicial de la tarea debe ser 'PENDING_APPROVAL'.
  - Solo el 'Partner' asignado a dicha tarea tiene la autorización de mutar el estado a 'APPROVED'.
- Atributos Requeridos: Al realizar la extracción, el esquema debe capturar la descripción del mensaje, ID del responsable, ID del activo del proyecto y una fecha límite opcional en formato DateTime (ISO 8601).

### 3.4 Sistema de Notificaciones
- Eventos de Disparo: Automatizar la creación de registros de notificación en Base de Datos cuando ocurra:
  - Evento: 'NewMessage' en canales donde el ID del usuario esté en la lista de participantes activos.
  - Evento: 'TaskAssigned' o 'TaskStatusChanged'.

## 4. REQUERIMIENTOS DE IMPLEMENTACIÓN EN FRONTEND (UI-ONCE)

### 4.1 Vistas e Interfaces
- Inbox Light: Bandeja de entrada estándar para comunicación directa 1-a-1 respetando las ACLs del Backend.
- Dashboard de Proyecto (Sección Chat): Layout con barra lateral izquierda para la selección de canales/salas y el panel de administración de roles exclusivo para el cliente.
- Context Menu / Acciones de Mensaje: Implementar un trigger en la UI (hover o botón de acción en el componente Message de Once UI) que despliegue un componente Modal de Once UI. Este modal servirá como formulario para configurar la conversión del mensaje a tarea.
- Tarjeta de Tarea Interactiva: Diseñar un componente 'TaskCard' integrado en el flujo de conversación del chat. Si el estado de la tarea es 'PENDING_APPROVAL', debe renderizar dos componentes condicionales (Buttons de aprobación/rechazo) visibles únicamente para el usuario asignado.
- Actualización de Dashboard: Adaptar el componente actual de visualización del Panel de Proyectos para que consuma en tiempo real (o mediante revalidación de caché) las nuevas tareas cuyo estado mute a 'APPROVED'.

## 5. FLUJO SEQUENCIAL DE EJECUCIÓN (SUPERVISOR)
1. Fase 1: Actualizar el archivo `schema.prisma`. Generar la migración local y ejecutar el push hacia Supabase. Validar la consistencia de tipos.
2. Fase 2: Construir los controladores de backend, Server Actions o API Routes necesarios para garantizar las reglas de privacidad y mutación de estados.
3. Fase 3: Diseñar los componentes de la interfaz utilizando el MCP de Once UI, garantizando la responsividad del layout.
4. Fase 4: Vincular la interacción del cliente en el chat con la persistencia en el panel de proyectos.
5. Fase 5: Ejecutar comandos de verificación estática de tipado (TypeScript compiler) y formateo (Linter) para validar que no existan advertencias ni errores en el árbol del proyecto.
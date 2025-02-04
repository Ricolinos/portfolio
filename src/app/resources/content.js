import { InlineCode } from "@/once-ui/components";

const person = {
  firstName: "Ricardo",
  lastName: "Gómez",
  get name() {
    return `${this.firstName} ${this.lastName}`;
  },
  role: "Diseñador Gráfico",
  avatar: "/images/avatar.jpg",
  location: "America/Mexico_City", // Expecting the IANA time zone identifier, e.g., 'Europe/Vienna'
  languages: ["Español", "Inglés"], // optional: Leave the array empty if you don't want to display languages
};

const newsletter = {
  display: true,
  title: <>Suscríbete a mi Blog</>, //{person.firstName} <-- esto es por si quiero llamar por el nombre "Default"
  description: (
    <>
      Ilustrador ocasional y Animador Motion a tiempo completo. Aquí relato mi experiencia
      en el mundo del diseño y les hago un registro de las herramientas 
      de diseño que me han funcionado.
    </>
  ),
};

const social = [
  // Links are automatically displayed.
  // Import new icons in /once-ui/icons.ts
  {
    name: "GitHub",
    icon: "github",
    link: "https://github.com/Ricolinos",
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/in/ricardo-g%C3%B3mez-ruiz-velasco-448b50aa/",
  },
  {
    name: "Instagram",
    icon: "instagram",
    link: "https://www.instagram.com/rick.olinos/",
  },
  {
    name: "Email",
    icon: "email",
    link: "mailto:ricardo@ricolinos.com",
  },
];

const home = {
  label: "Home",
  title: `Portafolio de ${person.name}`,
  description: `Mira mi portafolio como ${person.role}`,
  headline: <>Diseñador Gráfico</>,
  subline: (
    <>
      Soy <InlineCode>Diseñador Gráfico</InlineCode>, Animador Motion, ilustrador ocasional.
      <br />Y un explorador constante de nuevas herramientas de diseño.
    </>
  ),
};

const about = {
  label: "Sobre mí",
  title: "Sobre mí",
  description: `Meet ${person.name}, ${person.role} from ${person.location}`,
  tableOfContent: {
    display: true,
    subItems: false,
  },
  avatar: {
    display: true,
  },
  calendar: {
    display: true,
    link: "https://calendar.app.google/uzjKpMvDLW51CwDV8",
  },
  intro: {
    display: true,
    title: "Introducción",
    description: (
      <>
        Ricardo Gómez, Diseñador gráfico apasionado de la ilustración, la animación y la tecnología.
        Originario de la vibrante CDMX. Con estudios en Diseño Gráfico 
        y un diplomado en Creatividad Digital, ha explorado el fascinante mundo del motion graphics,
         la tecnología y un poco de programación web. Para Ricardo, cada desafío es una oportunidad para crear 
         algo único y significativo. 
      </>
    ),
  },
  work: {
    display: true, // set to false to hide this section
    title: "Experiencia Laboral",
    experiences: [
      {
        company: "NBA Mexico (independiente)",
        timeframe: "2021 - A la actualidad",
        role: "Animador Motion",
        achievements: [
          <>
            Diseño y creación de paquetes gráficos, desarrollando contenidos visuales 
            innovadores y atractivos para captar la atención de la audiencia.
          </>,
          <>
            Optimización de proyectos en After Effects, implementando técnicas y flujos de 
            trabajo que redujeron tiempos de entrega y mejoraron la eficiencia del equipo.
          </>,
          <>
            Desarrollo de presentaciones visuales impactantes para la NBA, contribuyendo a 
            fortalecer relaciones con partners comerciales y destacando la marca con un enfoque creativo y profesional.
          </>,
        ],

        
        images: [
          // optional: leave the array empty if you don't want to display images
          {
            src: "/images/projects/project-NBA/cover-01.png",
            alt: "Once UI Project",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        company: "Helvex",
        timeframe: "2020 - 2021",
        role: "Diseñador Senior",
        achievements: [
          <>
            Desarrollo de la línea gráfica para los contenidos en redes sociales de la "Proyecta", 
            creando una identidad visual coherente y moderna que reforzó la imagen corporativa.
          </>,
          <>
            Seguimiento editorial de catálogos de productos, asegurando la consistencia en el diseño, 
            la calidad visual y el cumplimiento de los plazos de entrega.
          </>,
          <>
          Colaboración con equipos multidisciplinarios para alinear los diseños con las estrategias 
          de marketing y las necesidades del negocio.
        </>,
        <>
          Creación de materiales gráficos para campañas publicitarias, eventos y promociones, 
          logrando una comunicación visual efectiva y atractiva.
        </>,
        ],
        images: [
          // optional: leave the array empty if you don't want to display images
          {
            src: "/images/projects/project-Helvex/img-01.jpg",
            alt: "Once UI Project",
            width: 9,
            height: 9,
          },
        ],
      },
    ],
  },
  studies: {
    display: true, // set to false to hide this section
    title: "Estudios",
    institutions: [
      {
        name: "Universidad Autónoma Metropolitana",
        description: <>Diseño de la comunicación Gráfica</>,
      },
      {
        name: "Invaders Institute",
        description: <>Diplomado en creatividad Digital</>,
      },
    ],
  },
  technical: {
    display: false, // set to false to hide this section
    title: "Habilidades",
    skills: [
      {
        title: "Figma",
        description: <>Able to prototype in Figma with Once UI with unnatural speed.</>,
        // optional: leave the array empty if you don't want to display images
        images: [
          {
            src: "/images/projects/project-01/cover-02.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
          {
            src: "/images/projects/project-01/cover-03.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        title: "Next.js",
        description: <>Building next gen apps with Next.js + Once UI + Supabase.</>,
        // optional: leave the array empty if you don't want to display images
        images: [
          {
            src: "/images/projects/project-01/cover-04.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
};

const blog = {
  label: "Blog",
  title: "Escribiendo sobre ilustración, tecnología y diseño...",
  description: `Lee las últimas entradas y actualizaciones de ${person.name}`,
  // Create new blog posts by adding a new .mdx file to app/blog/posts
  // All posts will be listed on the /blog route
};

const work = {
  label: "Trabajo",
  title: "Mis proyectos",
  description: `Diseño y desarrollo de proyectos realizados por ${person.name}`,
  // Create new project pages by adding a new .mdx file to app/blog/posts
  // All projects will be listed on the /home and /work routes
};

const gallery = {
  label: "Galería",
  title: "Mi galería de imagenes",
  description: `Una muestra visual de los proyectos ejecutados por ${person.name}`,
  // Images from https://pexels.com
  images: [
    {
      src: "/images/gallery/img-01.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/img-02.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-03.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/img-04.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-05.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-06.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-07.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-08.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/img-09.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-10.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/img-11.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-12.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-13.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/img-14.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/img-15.jpg",
      alt: "image",
      orientation: "vertical",
    },
  ],
};

export { person, social, newsletter, home, about, blog, work, gallery };

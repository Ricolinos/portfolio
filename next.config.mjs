import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  experimental: {
    serverActions: {
      // Las imágenes/GIFs/videos del editor viajan como data URLs dentro del
      // body de la server action (sin bucket de Storage): el default de 1 MB
      // se queda corto con un par de fotos comprimidas. 15mb (no 10mb) por
      // el video: la spec de portada/bloque "video" acepta .mp4 de hasta
      // 10MB, pero base64 (data URL) infla el tamaño real ~4/3 (~33%) — 10MB
      // de archivo ⇒ ~13.4MB de data URL, así que el límite del body debe
      // cubrir eso con margen. AVISO DE PRODUCCIÓN: Vercel capa el body de
      // las funciones serverless a ~4.5MB SIN IMPORTAR este valor —en
      // producción, subir un video de más de ~3MB fallará hasta que exista
      // un bucket de Storage real; este límite de 15mb solo habilita el
      // flujo completo en desarrollo local.
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "**",
      },
    ],
  },
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);

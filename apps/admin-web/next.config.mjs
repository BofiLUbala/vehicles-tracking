/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sortie "standalone" : Next.js copie dans .next/standalone uniquement les fichiers
  // (server.js + node_modules tracés) nécessaires à l'exécution, ce qui permet une image
  // Docker de runtime beaucoup plus légère (pas besoin de copier node_modules entier).
  output: 'standalone',
};

export default nextConfig;

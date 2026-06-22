/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita que Next infiera mal la raíz cuando hay otro lockfile en un directorio padre.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;

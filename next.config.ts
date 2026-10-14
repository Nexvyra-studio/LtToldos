import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Libera o acesso pelo celular na rede local durante o "npm run dev".
  // Sem isso o Next bloqueia os scripts no celular: a página aparece,
  // mas não calcula nada e recarrega sozinha a cada poucos segundos.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;

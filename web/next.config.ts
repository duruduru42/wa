import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // playwright는 번들 대상이 아닌 외부 node 모듈로 처리 (PDF 내보내기 라우트)
  serverExternalPackages: ["playwright"],
};

export default nextConfig;

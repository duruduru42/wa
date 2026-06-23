import type { CapacitorConfig } from "@capacitor/cli";

// AI 오답노트 네이티브 래퍼 (스펙 §5 "추후 Capacitor 네이티브 래핑").
// 앱은 Next.js 서버를 WebView로 로드한다(서버 컴포넌트·API·RLS 그대로 재사용).
// - 폰 테스트: 같은 와이파이에서 이 PC의 LAN 주소로 접속
// - 배포: CAP_SERVER_URL 을 클라우드 배포 URL(https)로 교체하고 cleartext 제거
const config: CapacitorConfig = {
  appId: "com.wa.odapnote",
  appName: "AI 오답노트",
  webDir: "capacitor-www",
  server: {
    url: process.env.CAP_SERVER_URL || "http://192.168.219.109:3000",
    cleartext: true,
  },
};

export default config;

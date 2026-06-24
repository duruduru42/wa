"use client";

import { useEffect } from "react";

// 안드로이드 하드웨어 뒤로가기 → 앱에서 나가지 말고 이전 화면으로.
// (히스토리 없을 때만 앱 종료) — Capacitor 네이티브에서만 동작, 웹에선 무해.
export function BackButtonHandler() {
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        remove = () => {
          handle.remove();
        };
      } catch {
        /* 웹 환경: 플러그인 없음 — 무시 */
      }
    })();
    return () => remove?.();
  }, []);
  return null;
}

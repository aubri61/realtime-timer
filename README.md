
# Realtime Timer

Angular와 Electron을 활용해 만든 간단한 데스크톱 포모도로 타이머 앱입니다.

Angular의 signal / computed 기반 상태 관리와 Electron의 main / preload / renderer 구조, IPC 통신 등을 직접 구현해보며 Angular와 Electron이 함께 동작하는 방식을 이해하기 위한 학습용 프로젝트입니다.

---

## 주요 기능

- 포모도로 타이머 (work / short break / long break 상태 전환)
- 타이머 시작 / 일시정지 / 리셋
- 상태에 따른 UI 분기 렌더링
- Always-on-top 오버레이 타이머 모드
- 윈도우 투명도 기반 미니 타이머 UI
- macOS Notification 알림
- 시스템 사운드 재생
- Tray 메뉴에서 앱 제어
- 알림 사운드 설정 저장 (localStorage)

---

## 기술 스택

Frontend
- Angular
- TypeScript
- HTML
- CSS

Desktop Runtime
- Electron

Electron APIs
- BrowserWindow
- Tray
- Notification
- IPC
- Context Bridge

---

## Electron 구조

Electron은 다음과 같은 구조로 동작합니다.

Renderer (Angular UI)  
Preload (Bridge)  
Main Process (Electron)

Angular UI에서 Electron 기능을 직접 호출하지 않고  
preload를 통해 노출된 API를 사용하도록 구성했습니다.

예시

Angular

```ts
window.electronAPI.toggleOverlay()
```

Preload

```js
contextBridge.exposeInMainWorld(...)
```

Main

```js
ipcMain.handle(...)
```

---

## 상태 관리

타이머 상태는 Angular signal을 사용해 관리했습니다.

예

- remainingSeconds
- isRunning
- mode
- overlayEnabled

UI에 표시되는 값은 computed로 분리했습니다.

예

- formattedTime
- modeLabel

타이머 상태에 따라 템플릿을 분기해 서로 다른 UI를 렌더링하도록 구현했습니다.

---

## 실행 방법

install

```bash
npm install
```

build

```bash
npm run build
```

electron 실행

```bash
npm run electron
```

---

## 목적

Angular와 Electron을 처음 사용하면서 다음 구조를 직접 구현해보기 위해 만든 프로젝트입니다.

- Angular 상태 관리 방식
- 상태 기반 UI 분기
- Electron main / preload / renderer 구조
- IPC 기반 프로세스 통신
- Tray / Notification 등 데스크톱 앱 기능

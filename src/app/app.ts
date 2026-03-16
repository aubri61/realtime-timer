import { Component, OnDestroy, computed, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

type PomodoroMode = 'work' | 'short-break' | 'long-break';

const DEFAULT_FOCUS_SECONDS = 5;
const DEFAULT_BREAK_SECONDS = 5;

const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

// 초 단위 테스트 옵션(5초, 10초) + 분 단위 실사용 옵션(10분~60분)
const FOCUS_SECONDS_OPTIONS = [
  5,
  10,
  10 * 60,
  15 * 60,
  20 * 60,
  25 * 60,
  30 * 60,
  35 * 60,
  40 * 60,
  45 * 60,
  50 * 60,
  55 * 60,
  60 * 60,
];

const BREAK_SECONDS_OPTIONS = [5, 5 * 60, 10 * 60, 15 * 60, 20 * 60, 25 * 60, 30 * 60];

const SOUND_OPTIONS = ['Ping', 'Glass', 'Hero', 'Funk', 'Pop', 'Submarine', 'Basso', 'Sosumi'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly focusSeconds = signal(DEFAULT_FOCUS_SECONDS);
  protected readonly breakSeconds = signal(DEFAULT_BREAK_SECONDS);
  protected readonly mode = signal<PomodoroMode>('work');
  protected readonly isRunning = signal(false);
  protected readonly remainingSeconds = signal(DEFAULT_FOCUS_SECONDS);
  protected completedPomodoros = signal(0);

  protected readonly focusOptionsSeconds = FOCUS_SECONDS_OPTIONS;
  protected readonly breakOptionsSeconds = BREAK_SECONDS_OPTIONS;
  protected readonly soundOptions = SOUND_OPTIONS;
  protected readonly workSound = signal<string>('Ping');
  protected readonly breakSound = signal<string>('Ping');

  protected readonly overlayEnabled = signal(false);
  protected readonly showSettings = signal(false);
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedWork = window.localStorage.getItem('workSound');
      const savedBreak = window.localStorage.getItem('breakSound');
      if (savedWork && SOUND_OPTIONS.includes(savedWork)) {
        this.workSound.set(savedWork);
      }
      if (savedBreak && SOUND_OPTIONS.includes(savedBreak)) {
        this.breakSound.set(savedBreak);
      }
    }
  }

  protected readonly modeLabel = computed(() => {
    switch (this.mode()) {
      case 'work':
        return '집중';
      case 'short-break':
        return '짧은 휴식';
      case 'long-break':
        return '긴 휴식';
    }
  });

  protected readonly formattedTime = computed(() => {
    const total = this.remainingSeconds();
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  protected toggleSettings() {
    this.showSettings.update((v) => !v);
  }

  protected updateWorkSound(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    this.workSound.set(value);
    this.playPreview(value);
  }

  protected updateBreakSound(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    this.breakSound.set(value);
    this.playPreview(value);
  }

  protected saveSettings() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('workSound', this.workSound());
      window.localStorage.setItem('breakSound', this.breakSound());
    }
    this.showSettings.set(false);
  }

  protected cancelSettings() {
    if (typeof window !== 'undefined') {
      const savedWork = window.localStorage.getItem('workSound');
      const savedBreak = window.localStorage.getItem('breakSound');
      if (savedWork && SOUND_OPTIONS.includes(savedWork)) {
        this.workSound.set(savedWork);
      }
      if (savedBreak && SOUND_OPTIONS.includes(savedBreak)) {
        this.breakSound.set(savedBreak);
      }
    }
    this.showSettings.set(false);
  }

  protected updateFocusSeconds(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value) {
      return;
    }
    this.focusSeconds.set(value);

    if (this.mode() === 'work' && !this.isRunning()) {
      this.remainingSeconds.set(value);
    }
  }

  protected updateBreakSeconds(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value) {
      return;
    }
    this.breakSeconds.set(value);

    if (this.mode() !== 'work' && !this.isRunning()) {
      this.remainingSeconds.set(this.getDurationForMode(this.mode()));
    }
  }

  protected setMode(mode: PomodoroMode) {
    this.mode.set(mode);
    this.isRunning.set(false);
    this.clearTimer();
    this.remainingSeconds.set(this.getDurationForMode(mode));
  }

  protected toggleTimer() {
    if (this.isRunning()) {
      this.pause();
    } else {
      this.start();
    }
  }

  protected reset() {
    this.isRunning.set(false);
    this.clearTimer();
    this.mode.set('work');
    this.remainingSeconds.set(this.getDurationForMode('work'));
  }

  protected async toggleOverlay() {
    const api = window.electronAPI;
    if (!api) {
      return;
    }
    const next = await api.toggleOverlay();
    this.overlayEnabled.set(next);
  }

  protected playPreview(name: string) {
    if (typeof window === 'undefined') return;
    const api = window.electronAPI;
    if (!api || typeof api.playSystemSound !== 'function') return;
    api.playSystemSound(name);
  }

  private start() {
    if (this.timerId) {
      return;
    }

    this.isRunning.set(true);
    this.timerId = setInterval(() => {
      const current = this.remainingSeconds();
      if (current <= 1) {
        this.handleFinished();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  private pause() {
    this.isRunning.set(false);
    this.clearTimer();
  }

  private handleFinished() {
    this.clearTimer();
    this.isRunning.set(false);

    const api = window.electronAPI;
    if (api && typeof api.notifyTimerFinished === 'function') {
      api.notifyTimerFinished(this.mode());
    }

    this.playLocalSound();

    if (this.mode() === 'work') {
      this.completedPomodoros.update((v) => v + 1);
      const nextMode =
        this.completedPomodoros() % 4 === 0 ? 'long-break' : 'short-break';
      this.setMode(nextMode);
    } else {
      this.setMode('work');
    }
  }

  private clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private getDurationForMode(mode: PomodoroMode) {
    switch (mode) {
      case 'work':
        return this.focusSeconds();
      case 'short-break':
        return this.breakSeconds();
      case 'long-break':
        return this.breakSeconds() * 3;
    }
  }

  private playLocalSound() {
    if (typeof window === 'undefined') {
      return;
    }

    const api = window.electronAPI;
    if (!api || typeof api.playSystemSound !== 'function') {
      return;
    }

    const mode = this.mode();
    const soundName = mode === 'work' ? this.workSound() : this.breakSound();
    api.playSystemSound(soundName);
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}

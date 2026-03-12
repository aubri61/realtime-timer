import { Component, OnDestroy, computed, signal } from '@angular/core';
import { NgFor } from '@angular/common';

type PomodoroMode = 'work' | 'short-break' | 'long-break';

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

const FOCUS_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const BREAK_OPTIONS = [5, 10, 15, 20, 25, 30];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly focusMinutes = signal(WORK_MINUTES);
  protected readonly breakMinutes = signal(SHORT_BREAK_MINUTES);
  protected readonly mode = signal<PomodoroMode>('work');
  protected readonly isRunning = signal(false);
  protected readonly remainingSeconds = signal(WORK_MINUTES * 60);
  protected completedPomodoros = signal(0);

  protected readonly focusOptions = FOCUS_OPTIONS;
  protected readonly breakOptions = BREAK_OPTIONS;
  protected readonly overlayEnabled = signal(false);

  private timerId: ReturnType<typeof setInterval> | null = null;

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

  protected updateFocusMinutes(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value) {
      return;
    }
    this.focusMinutes.set(value);

    if (this.mode() === 'work' && !this.isRunning()) {
      this.remainingSeconds.set(value * 60);
    }
  }

  protected updateBreakMinutes(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value) {
      return;
    }
    this.breakMinutes.set(value);

    if (this.mode() !== 'work' && !this.isRunning()) {
      this.remainingSeconds.set(this.getDurationForMode(this.mode()) * 60);
    }
  }

  protected setMode(mode: PomodoroMode) {
    this.mode.set(mode);
    this.isRunning.set(false);
    this.clearTimer();
    this.remainingSeconds.set(this.getDurationForMode(mode) * 60);
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
    this.remainingSeconds.set(this.getDurationForMode(this.mode()) * 60);
  }

  protected async toggleOverlay() {
    const api = window.electronAPI;
    if (!api) {
      return;
    }
    const next = await api.toggleOverlay();
    this.overlayEnabled.set(next);
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
        return this.focusMinutes();
      case 'short-break':
        return this.breakMinutes();
      case 'long-break':
        return this.breakMinutes() * 3;
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}

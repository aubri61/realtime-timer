import { Component, OnDestroy, computed, signal } from '@angular/core';

type PomodoroMode = 'work' | 'short-break' | 'long-break';

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly mode = signal<PomodoroMode>('work');
  protected readonly isRunning = signal(false);
  protected readonly remainingSeconds = signal(WORK_MINUTES * 60);
  protected completedPomodoros = signal(0);

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
        return WORK_MINUTES;
      case 'short-break':
        return SHORT_BREAK_MINUTES;
      case 'long-break':
        return LONG_BREAK_MINUTES;
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}

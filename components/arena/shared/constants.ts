/** Arena layout constants — positions, sizes, timing */

/* ── Positions ── */
export const PODIUM_YOU_POS: [number, number, number] = [-3.5, 0, 2];
export const PODIUM_RIVAL_POS: [number, number, number] = [3.5, 0, 2];
export const BUZZER_POS: [number, number, number] = [0, 1.5, 4];
export const QUESTION_BOARD_POS: [number, number, number] = [0, 6, -4];
export const FLOOR_Y = 0;

/* ── Sizes ── */
export const FLOOR_RADIUS = 16;
export const FLOOR_SEGMENTS = 64;

export const PODIUM_WIDTH = 2.4;
export const PODIUM_HEIGHT = 2.2;
export const PODIUM_DEPTH = 1.6;

export const BUZZER_RADIUS = 1.2;
export const BUZZER_BASE_RADIUS = 0.8;
export const BUZZER_BASE_HEIGHT = 0.4;

export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 5;

export const OPTION_PANEL_W = 5;
export const OPTION_PANEL_H = 1.6;

export const SEAT_COUNT = 48;
export const SEAT_RADIUS = 14;

export const PIP_SIZE = 0.25;

/* ── Camera ── */
export const CAMERA_FOV = 50;
export const CAMERA_POS: [number, number, number] = [0, 8, 18];
export const CAMERA_TARGET: [number, number, number] = [0, 2, 0];

/* ── Animation durations (seconds) ── */
export const ENTRANCE_DURATION = 1.2;
export const BUZZER_PULSE_PERIOD = 1.2;
export const STAMP_DURATION = 0.8;
export const CHIP_DURATION = 1.25;
export const SHAKE_DURATION = 0.3;
export const RING_EXPAND_DURATION = 0.9;

/* ── Colors ── */
export const ARENA_BG = '#0a0a09';
export const MARK_COLORS = {
  right: '#22c55e',
  wrong: '#ef4444',
  struck: '#6b7280',
  default: '#1e1e1c',
} as const;

export const BUZZER_LIVE_COLOR = '#dc2626';
export const BUZZER_IDLE_COLOR = '#4b5563';
export const TIMER_COLOR = '#c6f432';

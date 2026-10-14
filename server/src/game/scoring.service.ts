import { Injectable } from '@nestjs/common';
import { ELO_K_FACTOR } from '../config/game.config';

@Injectable()
export class ScoringService {
  /** Points for a correct toss-up answer. +5 speed bonus if buzzed within 2s of unlock. */
  tossUpPoints(buzzedBeforeUnlock: boolean, buzzFastMs: number | null): number {
    if (buzzedBeforeUnlock) return 10; // no speed bonus for pre-unlock buzzes
    const speedBonus = buzzFastMs !== null && buzzFastMs <= 2000 ? 5 : 0;
    return 10 + speedBonus;
  }

  /** Penalty for a wrong early buzz. */
  earlyPenalty(): number {
    return -5;
  }

  /** Points for a correct rebound/steal. */
  reboundPoints(): number {
    return 5;
  }

  /** Points for a correct bonus answer. */
  bonusPoints(): number {
    return 10;
  }

  /** Calculate Elo rating change. */
  eloChange(playerRating: number, opponentRating: number, result: number): number {
    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return Math.round(ELO_K_FACTOR * (result - expected));
  }

  /** Determine match result: 1 = win, 0 = loss, 0.5 = draw */
  matchResult(scoreA: number, scoreB: number): number {
    if (scoreA > scoreB) return 1;
    if (scoreA < scoreB) return 0;
    return 0.5;
  }
}

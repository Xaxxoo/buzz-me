import { Injectable } from '@nestjs/common';
import { ELO_K_FACTOR } from '../config/game.config';

@Injectable()
export class ScoringService {
  /** Points for a correct toss-up answer. */
  tossUpPoints(early: boolean): number {
    return early ? 15 : 10;
  }

  /** Penalty for a wrong early buzz. */
  earlyPenalty(): number {
    return -5;
  }

  /** Points for a correct rebound/steal. */
  reboundPoints(): number {
    return 10;
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

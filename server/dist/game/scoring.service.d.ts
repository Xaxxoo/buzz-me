export declare class ScoringService {
    tossUpPoints(early: boolean): number;
    earlyPenalty(): number;
    reboundPoints(): number;
    bonusPoints(): number;
    eloChange(playerRating: number, opponentRating: number, result: number): number;
    matchResult(scoreA: number, scoreB: number): number;
}

"""
Instant Runoff Voting (IRV) implementation.

Given a list of ballots (each ballot is an ordered list of candidate IDs),
returns the winner and the full round-by-round elimination history.
"""
from collections import defaultdict
from copy import deepcopy


def run_irv(ballots: list[list[str]], candidates: list[str]) -> dict:
    """
    Args:
        ballots: List of ranked ballots. Each ballot is an ordered list of
                 candidate IDs (most preferred first).
        candidates: Full list of candidate IDs.

    Returns:
        {
            "winner": str,
            "rounds": [{"counts": {id: count}, "eliminated": id | None}],
            "final_ranking": [{"rank": int, "candidate": str}]
        }
    """
    active = set(candidates)
    rounds = []
    elimination_order = []

    while True:
        counts: dict[str, int] = defaultdict(int)
        for ballot in ballots:
            # Find the highest-ranked still-active candidate on this ballot
            for choice in ballot:
                if choice in active:
                    counts[choice] += 1
                    break

        total = sum(counts.values())
        round_data = {
            "counts": dict(counts),
            "total_votes": total,
        }

        if total == 0:
            # No votes cast — no winner
            rounds.append({**round_data, "eliminated": None})
            break

        # Check for majority winner
        for candidate, count in counts.items():
            if count > total / 2:
                rounds.append({**round_data, "eliminated": None, "winner": candidate})
                final_ranking = _build_ranking(elimination_order, candidate, counts)
                return {"winner": candidate, "rounds": rounds, "final_ranking": final_ranking}

        # Eliminate the candidate with fewest votes
        min_votes = min(counts.get(c, 0) for c in active)
        # Among tied-for-last candidates, eliminate alphabetically for determinism
        to_eliminate = sorted(
            [c for c in active if counts.get(c, 0) == min_votes]
        )[0]

        rounds.append({**round_data, "eliminated": to_eliminate})
        active.discard(to_eliminate)
        elimination_order.append(to_eliminate)

        if len(active) == 1:
            winner = list(active)[0]
            rounds.append({"counts": {winner: counts.get(winner, 0)}, "total_votes": total, "eliminated": None, "winner": winner})
            final_ranking = _build_ranking(elimination_order, winner, counts)
            return {"winner": winner, "rounds": rounds, "final_ranking": final_ranking}

        if len(active) == 0:
            break

    return {"winner": None, "rounds": rounds, "final_ranking": []}


def _build_ranking(elimination_order: list[str], winner: str, final_counts: dict) -> list[dict]:
    """Build final ranking: winner is #1, then reverse elimination order."""
    ranking = [{"rank": 1, "candidate": winner}]
    for rank, candidate in enumerate(reversed(elimination_order), start=2):
        ranking.append({"rank": rank, "candidate": candidate})
    return ranking

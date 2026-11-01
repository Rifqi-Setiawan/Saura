def evaluate_recovery_status(
    ratios: list[float] | tuple[float, ...],
    recovery_ratio: float = 0.90,
    required_days: int = 3,
    action_threshold: float = 0.75,
) -> str:
    """Evaluate recovery progress from consecutive valid reports after technician intervention.

    Returns:
    - 'RESOLVED': reached required_days consecutive reports >= recovery_ratio
    - 'REOPENED': a subsequent report fell to ACTION/CRITICAL (< action_threshold)
    - 'MONITORING': ongoing observation, or streak reset by non-qualifying normal reading (0.75 <= r < 0.90)
    """
    if not ratios:
        return "MONITORING"

    streak = 0
    current_status = "MONITORING"

    for ratio in ratios:
        if ratio < action_threshold:
            streak = 0
            current_status = "REOPENED"
        elif ratio < recovery_ratio:
            streak = 0
            current_status = "MONITORING"
        else:
            streak += 1
            if streak >= required_days:
                current_status = "RESOLVED"
            else:
                current_status = "MONITORING"

    return current_status

"""Summary statistics. Two bugs; one is obvious and one is not.

Run this file to see which checks fail. Fix the functions above the check
harness - the harness itself is correct and should not be edited.
"""


def mean(values):
    return sum(values) / len(values)


def median(values):
    ordered = sorted(values)
    middle = len(ordered) // 2
    # BUG 1 (obvious): for an even-length list this returns the upper of the two
    # middle values instead of their average.
    return ordered[middle]


def summarise(values):
    # BUG 2 (subtle): an empty list raises ZeroDivisionError from mean() rather
    # than returning an empty summary with mean and median set to None.
    return {"n": len(values), "mean": mean(values), "median": median(values)}


CHECKS = [
    ("median of an even-length list", lambda: summarise([1, 2, 3, 4])["median"], 2.5),
    ("median of a single value", lambda: summarise([5])["median"], 5),
    ("mean of an even-length list", lambda: summarise([1, 2, 3, 4])["mean"], 2.5),
    ("empty input must not raise", lambda: summarise([])["n"], 0),
    ("empty input has a null mean", lambda: summarise([])["mean"], None),
]


def run_checks():
    failures = []
    for label, thunk, expected in CHECKS:
        try:
            actual = thunk()
        except Exception as error:  # noqa: BLE001
            failures.append(f"{label}: raised {type(error).__name__}")
            continue
        if actual != expected:
            failures.append(f"{label}: got {actual!r}, want {expected!r}")
    return failures


if __name__ == "__main__":
    problems = run_checks()
    if problems:
        print("FAIL")
        for problem in problems:
            print(f"  - {problem}")
    else:
        print("PASS: all checks")

"""Lesson 13 - the Academy's grader prompt, preserved.

LEGACY. Two problems, both visible without spending a token.

1. The rendered lesson builds `eval_prompt` as a PLAIN triple-quoted string
   containing {task} and {solution}. Python does not interpolate that. The judge
   receives the literal braces.
2. It then prefills "```json" to force JSON out of the judge, which returns a
   400 on current models (see lesson 8).

This file demonstrates (1) locally - no API call, no cost.

    uv run lesson 13 legacy
"""

task = "Summarise the support email in one sentence."
solution = "Customer was charged twice for order #A-77210 and needs a refund today."

# LEGACY: no f prefix. This is the bug as rendered in the lesson.
eval_prompt_broken = """
Evaluate this solution.
Task: {task}
Solution: {solution}
Reply with pass or fail.
"""

# Correct: interpolate.
eval_prompt_fixed = f"""
Evaluate this solution.
Task: {task}
Solution: {solution}
Reply with pass or fail.
"""

print("--- as rendered in the lesson ---")
print(eval_prompt_broken)
print("--- with the f prefix ---")
print(eval_prompt_fixed)
print(
    "The first prompt sends the judge the literal text '{task}'.\n"
    "example.py goes further and serialises the values as JSON, so a support\n"
    "email containing instructions is graded rather than obeyed."
)

# 40 · Image support

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 40, _Image support_
>
> **2026 status: 🟠 Core API current, every number in the lesson is wrong**

## What the lesson teaches

Send images as `image` content blocks and ask questions about them. Put the image
_before_ the text.

## What the Academy does

```python
{"type": "image",
 "source": {"type": "base64", "media_type": "image/jpeg", "data": image_data}}
```

Correct, and still the most common form.

## What changed

### A third source type

| `source.type` | When                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| `base64`      | one-off, small                                                             |
| `url`         | the image is already public                                                |
| **`file`**    | **new** — upload once via the Files API, reference by `file_id` many times |

`file` is the one that matters in a multi-turn app. Every request resends the whole
history; with base64 images, that means resending the full bytes on every turn. A
`file_id` keeps the payload small no matter how long the conversation gets.

### The limits are all different

|                    | Academy              | Current (Claude API)                                         |
| ------------------ | -------------------- | ------------------------------------------------------------ |
| Images per request | ~100                 | **100** for 200k-context models, **600** for everything else |
| Max size per image | ~5 MB                | **10 MB** (5 MB on Bedrock / Google Cloud)                   |
| Max dimensions     | 8000×8000            | 8000×8000                                                    |
| Formats            | JPEG, PNG, GIF, WebP | unchanged (animations unsupported — first frame only)        |

Two caveats the raw numbers hide:

- **Over 20 images in one request**, a stricter _per-image dimension_ limit applies to
  every image in that request. Resize so neither dimension exceeds 2000px, or stay at
  20 or fewer. Images inside `tool_result` content count toward the threshold too.
- The 32 MB **request size limit** will usually stop you long before 600 images.

### Resolution tiers changed the token maths

Claude views images in 28×28-pixel patches: `⌈w/28⌉ × ⌈h/28⌉` visual tokens.

| Tier            | Models               | Max long edge | Max visual tokens |
| --------------- | -------------------- | ------------- | ----------------- |
| High-resolution | Claude 4.7 and later | 2576 px       | 4784              |
| Standard        | everything else      | 1568 px       | 1568              |

A high-resolution model can spend roughly **3×** the visual tokens on the same image.
That is a real cost difference, and downsampling before upload is the lever.

## The current implementation

The same image sent three ways — base64, Files API `file_id`, and (for a public URL)
the `url` form — printing input tokens for each so the payload difference is visible,
plus a multi-image comparison and a token estimate from the patch formula checked
against `count_tokens`.

## Python vs TypeScript

Python passes a file object or tuple to `client.files.upload(...)`. TypeScript uses
`toFile()` from the SDK. The Files API is **out of beta** — use `client.files.*`.

## Run it

```bash
npm run lesson -- 40
uv run lesson 40

npm run lesson -- 40 -- --image assets/images/sat1.png
uv run lesson 40 -- --image assets/images/sat1.png
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Files API](https://platform.claude.com/docs/en/build-with-claude/files)
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)

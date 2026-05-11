---
title: AI Literacy for Everyone
slug: ai-literacy-101
---

# What large language models actually do

A large language model (LLM) like ChatGPT or Claude is not a search engine, not a database, and not a thinking machine. It is a statistical pattern matcher trained to predict the next token in a sequence. Trained on trillions of words, it has learned correlations rich enough to produce text that often looks like reasoning. It is reasoning only in the loose sense that a parrot is conversing.

Understanding this changes how you use it. LLMs are excellent at **rephrasing**, **summarising**, **brainstorming**, **drafting**, **explaining concepts in different ways**. They are unreliable at **specific facts** (especially numbers, dates, citations), **counting**, **multi-step arithmetic**, and **anything that requires you to know with certainty whether it's true**. The output looks confident regardless of whether it's right.

# Hallucination and how to catch it

When an LLM doesn't know something, it doesn't say "I don't know." It makes something up that sounds plausible. This is called hallucination, and it's not a bug to be patched out — it's a consequence of how the model works. Fake citations, fake legal cases, fake medical studies, fake people quotes — all confidently produced.

Defensive habits: **never trust a specific number** (price, year, statistic) without verifying. **Treat every citation as a guess** until you've clicked it. **Ask the model to show its reasoning step-by-step** for tasks where it might bluff. **Use the model as a draft generator, not a fact source** — write with it, but verify with primary sources before publishing or acting.

The corollary is that LLMs are most safely used for tasks where you can evaluate the output yourself. Asking it to rewrite your email more clearly: safe (you can judge). Asking it for the side effects of a specific medication: dangerous (you can't verify in real time).

# Prompting that gets better output

Prompts matter more than people expect. Five techniques cover most of the value:

**Give context.** "I'm a high school physics teacher in India" before "explain inertia" produces a better explanation than the cold question. **Specify the audience.** "Explain to a 10-year-old" or "explain to a fellow engineer" changes the level radically. **Specify format.** "Three bullet points, each under 15 words" produces three bullet points. The model honours format instructions more reliably than content instructions. **Show examples.** "Translate these the way I translated this first one: [example]." This is called few-shot prompting and is the single biggest lever in practical use. **Iterate.** Treat the first response as a draft; ask follow-ups. "Make it shorter." "Add a counter-argument." "Now from the customer's perspective."

# What AI can and can't replace in your job

The honest answer in 2026: AI replaces **tasks**, not most **jobs**. A radiologist whose job is 60% reading routine scans and 40% complex consultation may find the routine 60% increasingly assisted by AI — but the consultation, the patient relationship, and the edge-case judgement aren't going anywhere soon. The shape of the radiologist's day changes; the radiologist doesn't disappear.

The roles that change fastest involve high volumes of repetitive cognitive work where errors are tolerable or caught downstream: first-draft writing, code boilerplate, customer service triage, basic legal document review, image generation for non-critical content. The roles that change slowest involve novel physical movement, human trust under pressure, accountability for outcomes, and creative judgement at the highest end of a craft.

The best strategy is **upskill into using AI well in your existing field**, not retraining into something entirely new. Doctors who use AI to draft notes will outcompete doctors who don't, but they don't need to become ML engineers.

# Privacy, bias, and societal questions

Two practical concerns. **Privacy** — assume anything you paste into a cloud-hosted AI tool may be retained and used for training. Don't paste client confidential information, patient records, source code under NDA, or your unfiled patent ideas into ChatGPT or similar consumer tools. Use the enterprise or API versions with no-retention agreements, or run a local model (Llama, Mistral) for sensitive workflows.

**Bias** — models trained on internet text inherit the biases of internet text. They under-represent and stereotype minority groups, prefer certain dialects, and reproduce gender and caste assumptions baked into their training data. This is improving with newer models but isn't solved. If you're using AI to screen resumes, generate marketing creative, or make decisions about people, the bias of the tool becomes your bias by default. Audit outputs across demographics before deploying anywhere consequential.

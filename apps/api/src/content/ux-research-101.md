---
title: UX Research Basics
slug: ux-research-101
---

# Why research before design

Designing without research is like prescribing without a diagnosis. You will produce something — maybe even something beautiful — but there's no reason to believe it solves the user's actual problem. Research replaces "I think users want X" with "we observed users struggle with Y." That single shift changes every downstream decision.

The cheapest research is also the most valuable: talking to five users. Jakob Nielsen's classic finding holds up — five well-chosen interviews surface roughly 85% of the usability problems in any flow. You don't need a panel of 200 and a quant researcher; you need to find five people in your target audience, watch them use the thing, and shut up while they do.

# Interview discipline

A good user interview is a conversation, but a structured one. Three rules that separate signal from noise. **Ask about past behaviour, not hypothetical future behaviour** — "tell me about the last time you booked a flight" gives you reality; "would you use a feature that..." gives you wishful thinking. **Ask open questions** — "walk me through what you did" not "did you find it confusing?" Yes/no questions feed the answer back to the user. **Sit in the silence** — when they finish a sentence, wait four seconds before speaking. They almost always add something more honest.

Record the interview (with consent) so you can listen to tone and pauses later. Take only minimal notes during; eye contact matters more than your notebook. Transcribe and tag patterns afterwards — three users mentioning the same friction is a signal, one user is a story.

# Usability testing on a prototype

Once you have a prototype — even a paper sketch or a Figma click-through — put it in front of users with specific tasks. "Try to find a pediatrician in your area and book the next available slot" is a task. "What do you think of the design?" is feedback theatre.

Watch where they hesitate, scroll past, click the wrong thing, or get stuck. Don't help. Don't explain. The whole point is to see what happens when no designer is sitting next to them. If users can't complete the task within a reasonable time, you have a problem — not because users are dumb, but because the path through your design is unclear. Fix the design, not the users.

# Survey design — the careful art

Surveys scale where interviews can't, but they're easy to do badly. The two killer mistakes: **leading questions** ("How much do you love our product?") and **double-barrelled questions** ("Is our product easy to use and helpful?"). Each question should ask one thing, neutrally.

Likert scales (1–5 or 1–7) work for attitudes. Net Promoter Score ("how likely are you to recommend us") is widely used and widely criticised — it's useful as a trend over time, not as an absolute number. Always include at least one open-text field; the unstructured responses surface things you didn't think to ask about.

Be honest about who completed your survey. If you sent it to your existing happy customers, you'll get happy answers. If you posted on Twitter, you got the Twitter demographic. Sampling bias is the silent killer of survey insight.

# Synthesising findings

The hard part isn't running research — it's converting hours of interview tape and survey responses into decisions your team will act on. The standard tool is **affinity mapping**: write every observation on a sticky note, cluster similar ones, name each cluster, and look at what the clusters tell you. Themes that recur across five users matter. A vivid single quote is rhetorically powerful but not the same as a pattern.

Output a short research report — one page, not twenty. Top three findings, top three recommendations, and one or two memorable user quotes that make the abstract concrete. The goal is for the engineer reading this on Slack at 11pm to understand what to change and why. Length is the enemy of action.

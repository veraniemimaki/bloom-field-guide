# BLOOM — two-minute pitch

*About 2 minutes at a natural pace. Bracketed notes are demo cues, not spoken.*

TMS happens in a clinic. The ordinary moments afterward happen at home.

BLOOM is a personal sensory field guide for that part of the journey. It gives someone an optional way to explore which sounds they prefer—and lets their own feedback shape what they try next.

[Show the opening screen.]

You can start right away. Choose Forest or Northern Lights; each has its own pair of browser-generated sounds. Or add a self-reported check-in and a few words about the moment. BLOOM offers a starting point and explains why. You can change it, skip it, or stop.

[Open “See how feedback changes the next suggestion.”]

Here’s a fictional example: soft wind felt worse; rustling leaves felt better. For the same Forest scene and Wind down moment, BLOOM suggests leaves first and explains why. This demonstrates the adaptation logic. It is not evidence that BLOOM is useful or effective.

[Invite a judge to choose “Try the real sound comparison.” Briefly play each sound at the same level setting and let them rate it.]

That real rating flow is the experience we want to evaluate. BLOOM learns sound preferences from a person’s own choices, not their mental health. Notes stay in their browser, and suggestions use transparent rules.

[Show Community briefly, if time allows.]

We also built an optional peer space using Aiven PostgreSQL. Posts stay hidden until a human reviewer approves them. It supports optional peer sharing; it is separate from the core sound preference loop.

We haven’t formally evaluated BLOOM with people after TMS or clinicians. The idea—that a small, personalized sensory ritual may be useful at home after treatment—is a hypothesis. Our next step is co-design, then testing clarity, usefulness, accessibility, and whether people choose to return.

In 48 hours, we built a working loop: choose, listen, rate, and personalize the next suggestion.

**BLOOM: find a reset that feels like yours.**

## Demo preparation

The opening-screen button **See how feedback changes the next suggestion** shows the fictional adaptation logic. It uses Forest / Wind down ratings of **Soft wind — felt worse** and **Rustling leaves — felt better**, then displays the app-generated suggestion **Rustling leaves first**. The sample is not stored. Say explicitly that this demonstrates the rule, not effectiveness.

Then choose **Try the real sound comparison** and let a judge or audience member rate both sounds. This is the real interaction, but one trial is not user validation. Keep audio excerpts brief. Mention Community only if time allows; describe it as an optional peer-sharing feature, not the reason BLOOM’s core routine is useful.

The same level setting applies to both sounds; it does not claim matched perceived loudness.
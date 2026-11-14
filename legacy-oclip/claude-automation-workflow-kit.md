# Claude Automation Workflow Kit

Everything you need to build the Monday briefing from the tutorial and your next workflows in one file: the workflow card, project instructions, 12 ready workflow prompts, three scheduling prompts, a scheduling cheat sheet, an approval and safety checklist and a weekly review.

Replace every [bracket] with your own details. Claude reads and drafts. You approve and send.

---

## 1. Five rules before you automate anything

1. **Read first, draft second, you send.** Claude may read your data and prepare drafts on its own. A person sends. Never switch off approvals for sending or deleting.
2. **One workflow at a time.** Run it by hand at least three times, check every result, then schedule it. Build the next one only after four good weeks.
3. **Nothing private you do not need.** Keep passwords, ID numbers, bank details and client secrets out of prompts, files and connected folders.
4. **Real conversations only.** Anthropic's [usage policy](https://www.anthropic.com/legal/aup) prohibits helping distribute spam. Automate replies and updates to people you already deal with, not mass messages to strangers.
5. **No source, no claim.** Tell Claude to use only your calendar, emails and files, and to put anything it cannot find under "Questions for me" instead of guessing.

---

## 2. Workflow card (fill in before you open Claude)

**Job name:** [for example Monday briefing]

**Trigger (when it runs):** [every Monday at 8:00, or when I run it myself]

**Inputs (what Claude reads):** [calendar, flagged emails, a Drive folder, pasted notes]

**Steps:** [1] [2] [3]

**Output (what I get):** [a one-page briefing, a draft reply, a list]

**Checkpoint (what I approve):** [every draft, before anything is sent]

**The three tests:**

- [ ] It repeats at least once a week
- [ ] The steps are the same every time
- [ ] I can tell in two minutes whether the result is right

If any box is empty, pick a different job.

---

## 3. Project instructions (paste into "Set project instructions")

```
You run my [job name] for [business name].

Rules:
1. Use only information from my [calendar, flagged emails] and files in this project. Never invent a meeting, deadline, number or client detail.
2. Output these sections in this order: [Top three, Day by day, Replies I owe, Clashes and gaps, Questions for me].
3. Drafts are drafts. Never send, reply or change anything unless I tell you to in the chat.
4. Write in my voice: short sentences, warm, no hype, no exclamation marks.
5. Keep the whole result under one page.
6. If a source is empty or unavailable, say so at the top instead of filling the gap.
```

---

## 4. Twelve workflow prompts

Each one is read-only and draft-only. Add them to a Project with instructions like Part 3.

**Weekly planning (3)**

**1. Monday briefing**

> Run my Monday briefing for this week. Read my calendar for Monday to Friday and the emails labelled Flagged. Read only. Do not send or change anything.

**2. Friday wrap-up**

> Read my calendar and sent mail from this week. Write a short wrap-up: what I finished, what is still open, and the three things to start with on Monday. Use only what you can see. Put anything unclear under "Questions for me".

**3. Meeting prep**

> I have a meeting with [person or company] on [day]. Read my calendar entry and the last [five] emails with them. Give me a five-line summary, the open questions and three things to ask. Do not draft or send anything.

**Inbox (3)**

**4. Flagged email summary**

> Read the emails labelled [Flagged]. Group them as: needs a reply today, needs a reply this week, no reply needed. Give one line per email. Draft nothing yet.

**5. Reply drafts**

> For each email in the "needs a reply today" group, write a short draft in my voice. Use only facts from the email and my project files. Leave [BLANK] where you need a fact from me. Do not send anything.

**6. Follow-up check**

> Read my sent mail from the last [seven] days. List messages that asked a question and got no reply. For each one, draft a polite two-sentence follow-up that adds one useful point. Do not send.

**Content and clients (3)**

**7. Weekly content ideas**

> Read the notes in this project and my last [five] published posts listed in "posts.txt". Suggest five post ideas for next week, each with a one-line angle. Do not repeat a topic already covered.

**8. Client update draft**

> Read my notes for [client] in this project and this week's emails with them. Draft a short update: what was done, what is next, and what I need from them. Use only what is written. Do not send.

**9. Meeting notes to actions**

> Here are my notes from today's meeting: [paste]. List the decisions, the actions with an owner and a date where I gave one, and any question left open. Do not invent an owner or a date.

**Admin and reporting (3)**

**10. Invoice and payment reminders list**

> Read the file "invoices.csv" in this project. List invoices that are overdue and by how many days. Draft one polite reminder per client in my voice. Do not send.

**11. Weekly numbers**

> Read the file "weekly-numbers.csv". Summarize the three biggest changes since last week in plain words. Mark any figure you are unsure about. Do not guess a number that is not in the file.

**12. Monthly review**

> Read my four weekly wrap-ups in this project. Tell me which job came up most often, which one took the most time, and one job that would be worth automating next, with a draft workflow card.

---

## 5. Three scheduling prompts (for "Create with Claude")

On the paid plans, open Cowork, click **Scheduled**, then **New task** and **Create with Claude**. Paste one of these and confirm the details Claude shows you.

**A. Weekly**

> Every Monday at 8:00, run my Monday briefing from the project "Monday briefing". Read only. End with drafts only and do not send anything.

**B. Weekdays**

> Every weekday at 17:00, read the emails labelled Flagged and give me a short list of what needs a reply tomorrow. Draft nothing.

**C. Monthly**

> On the first weekday of each month, run the monthly review from the project "Weekly wrap-ups".

---

## 6. Scheduling cheat sheet

| What | How |
| --- | --- |
| Where | Claude Desktop, Cowork, Scheduled in the left sidebar, New task |
| Easy way | Create with Claude, describe it, then click Schedule |
| Manual way | Set up manually: task name, prompt, approval mode, frequency, optional model and folder, then Save |
| Frequencies | Hourly, daily, weekly, weekdays, manually |
| Plans | Paid plans (check the current help article) |
| Pause or edit | From the Scheduled page |
| Free plan | Put a calendar reminder at the same time and open the project |

Where a task runs can change, so read Anthropic's [scheduled tasks article](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork) before you rely on it.

---

## 7. Approval and safety checklist (before you schedule)

- [ ] I ran it by hand at least three times and checked every result
- [ ] Every item in the output matches my own calendar, emails or files
- [ ] The task prompt ends with "Drafts only. Do not send anything."
- [ ] Approval mode asks before Claude acts
- [ ] Gmail and Drive actions still ask my approval
- [ ] Nothing private is in the prompt, the files or the folder
- [ ] It only touches people and data I already deal with
- [ ] I know where to pause it

---

## 8. Weekly review (2 minutes, same day every week)

1. What was wrong in this week's result?
2. What was missing?
3. Which rule goes into the project instructions?
4. Did it save me time? (yes, no, about the same)
5. Did I read every draft before sending it?

After four weeks: keep it, change it or turn it off. Then start the next workflow from the card in Part 2.

---

Claude will not run your week for you. It saves you the Monday morning scramble, and the decisions are still yours.

Claude Automation Workflow Kit from https://coding180.com

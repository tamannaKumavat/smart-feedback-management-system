# Smart Feedback Flow

## 1. Message Classification

When the user sends a message, the system first classifies the message before running RAG.

### Salutation

Examples:

- `Hi`
- `Hello`
- `How are you?`

Expected behavior:

- Do not run RAG.
- Do not run triage.
- Do not create an issue summary.
- Do not create a ticket.
- Respond with a short greeting.

AI response example:

```text
Hi, how can I help you today?
```

### Non-Actionable Feedback

Examples:

- `I like your system`
- `Great platform`
- `I hate this feedback experience`

Expected behavior:

- Do not run RAG.
- Do not run triage.
- Do not create an issue summary.
- Do not create a ticket.
- Respond with a simple feedback acknowledgement.

AI response example:

```text
Thank you for your feedback.
```

## 2. Actionable Issue Flow

If the user message describes a real problem, question, or request that requires support, it is treated as an actionable issue.

Example:

```text
I have a problem with login.
```

Expected behavior:

1. Save the user message.
2. Run RAG search.
3. Decide whether RAG found a useful answer.

## 3. RAG Answer Found

If RAG finds a useful answer, the system sends the answer to the user.

AI message:

```json
{
  "content": "RAG answer ...",
  "ai_message_type": "rag_answer"
}
```

Then the user sees:

```text
Are you satisfied with this answer?
```

### User Answers Yes

User message:

```text
yes
```

Expected behavior:

1. Save the user's confirmation.
2. Send a closing AI response.
3. Save the conversation summary to the `issues` table.
4. Do not create a ticket.

AI response example:

```text
Thank you. I'm glad I could help.
```

### User Answers No

User message:

```text
no
```

Expected behavior:

1. Save the user's rejection.
2. Generate an issue summary from the conversation.
3. Send the issue summary to the user.

AI message:

```json
{
  "content": "Issue summary ...",
  "ai_message_type": "issue_summary"
}
```

Then ask:

```text
Is this correct?
```

## 4. RAG Answer Not Found

If RAG does not find a useful answer, the system moves to the issue summary flow.

Expected behavior:

1. Run triage if needed.
2. Generate an issue summary.
3. Send the summary to the user.

AI message:

```json
{
  "content": "Issue summary ...",
  "ai_message_type": "issue_summary"
}
```

Then ask:

```text
Is this correct?
```

## 5. Issue Summary Confirmation

After the system sends an `issue_summary`, the user must confirm whether the summary is correct.

### User Confirms Summary

User message:

```text
yes
```

Expected behavior:

1. Save the user's confirmation.
2. Save the confirmed issue summary to the `issues` table.
3. Create a ticket in the `tickets` table.
4. Close or finalize the issue flow.

Stored user confirmation type:

```json
{
  "ai_message_type": "user_confirmed"
}
```

### User Rejects Summary

User message:

```text
no
```

Expected behavior:

1. Save the user's rejection.
2. Do not create a ticket.
3. Ask the user for more detail.
4. When the user provides more detail, restart the actionable issue flow from RAG search.

Stored user rejection type:

```json
{
  "ai_message_type": "user_rejected"
}
```

AI response example:

```text
Can you explain it in more detail?
```

## 6. Message Type Summary

The expected AI/user message types are:

- `rag_answer`: AI answer generated from RAG results.
- `issue_summary`: AI-generated issue summary shown before ticket creation.
- `user_confirmed`: User confirmed either the RAG answer or the issue summary.
- `user_rejected`: User rejected either the RAG answer or the issue summary.

## 7. Final Decision Tree

```text
User message
  |
  |-- Salutation
  |     -> Reply: greeting
  |     -> Stop
  |
  |-- Non-actionable feedback
  |     -> Reply: "Thank you for your feedback."
  |     -> Stop
  |
  |-- Actionable issue
        -> Run RAG search
             |
             |-- RAG answer found
             |     -> Send ai_message_type = rag_answer
             |     -> Ask: "Are you satisfied with this answer?"
             |          |
             |          |-- User yes
             |          |     -> Save conversation summary to issues table
             |          |     -> Do not create ticket
             |          |     -> Stop
             |          |
             |          |-- User no
             |                Run the flow again
             |                
             |                
             |
             |-- RAG answer not found
                   -> Run triage if needed
                   -> Generate issue summary
                   -> Send ai_message_type = issue_summary
                   -> Ask: "Is this correct?"

Issue summary confirmation
  |
  |-- User yes
  |     -> Save summary to issues table
  |     -> Create ticket in tickets table
  |     -> Stop
  |
  |-- User no
        -> Ask user for more detail
        -> Restart from RAG search
```

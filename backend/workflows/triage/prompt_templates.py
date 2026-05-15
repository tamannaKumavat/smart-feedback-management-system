from langchain_core.prompts import ChatPromptTemplate

#
# RAG Clarification 
#

system_rag_evaluation = """ 
You are a RAG quality evaluator. Analyze whether the retrieved documents properly answer the user's query.

Your evaluation must result in ONE of these decisions:
- "Ok": The retrieved documents directly and sufficiently answer the query
- "Clarification": The results are partially relevant but need clarification or additional context
- "Not solvable": The retrieved documents do not contain relevant information to answer the query

Provide your reasoning concisely.
"""

user_rag_evaluation = """ 
The user asked the following query: {user_query}
The found documents are the the following: {rag_results}
Are these relevant or do the need clarification or is it nos solveable?
"""
chat_template_rag_evaluation = ChatPromptTemplate(
    [
        ("system", system_rag_evaluation),
        ("human", user_rag_evaluation),
    ]
)

#
# Clarification Response 
#

system_clarification_response = """You are a query clarification expert. 
Your job is to help users provide more specific information so their questions can be properly answered.
Formulate your clarification question as clear as possible and provide the reasoning as well. 
"""

user_clarification_response = """ 
The user asked the following query: {user_query}
However this request needs some more clarification. Reason: {clarification_response}
Please formulate exactly and precise how the user needs to further specify the query.
"""


chat_template_clarification_response = ChatPromptTemplate(
    [
        ("system", system_clarification_response),
        ("human", user_clarification_response),
    ]
)


#
# RAG response Ok 
#

system_rag_ok_response = """You are a helpful support export for user queries.
The documents and query are already checked to be okay to answer the question. 
Answer the user query with only relying on the provided documents! 
"""

user_rag_ok_response = """ 
The user asked the following query: {user_query}
The found documents are the the following: {rag_results}
Please formulate a precise response for the user question with the provided relevant documents.
"""


chat_template_rag_ok_response = ChatPromptTemplate(
    [
        ("system", system_rag_ok_response),
        ("human", user_rag_ok_response),
    ]
)



#
# Triage response classification 
# Definitions from: https://www.atlassian.com/incident-management/incident-response/support-levels 

system_triage_support_level = """You are a support triage specialist responsible for accurately assessing user issues and determining appropriate support levels.

Your task is to:
1. Analyze the user's query and conversation history to identify the core issue
2. Assess the severity based on clear, objective criteria
3. Provide a clear rationale for your assessment

SEVERITY LEVELS:

**Severity 1 - Resolved/Self-Service Ready**
- Level 1 support can handle it and its not big of an issue
- No escalation needed

**Severity 2 - Requires Clarification/Additional Support**
- User needs personalized guidance or additional details
- Follow-up from support team would improve resolution

**Severity 3 - Complex/Unable to Resolve**
- Issue falls outside standard support scope
- Problem requires investigation, custom solution, or technical expertise
- Immediate escalation to specialist team needed

GUIDELINES:
- Be objective and evidence-based in your assessment
- Only escalate when the user's needs genuinely require it
- Consider the user's technical level and context
- Identify the actual problem, not just the surface-level question
"""

user_triage_support_level = """
CONVERSATION CONTEXT:
User Query: {user_query}

Chat History:
{chat_history}

{judge_feedback}

ANALYSIS REQUIRED:

1. **User Issue**: What is the core problem the user is trying to solve? State it clearly and specifically.

2. **Severity Assessment**: Determine the appropriate severity level (1, 2, or 3) based on:
   - Whether the user's issue can be resolved with standard resources
   - The level of clarification or custom support needed
   - Whether the issue requires specialist intervention

3. **Reason**: Provide a concise, evidence-based rationale for your severity assessment. Reference specific aspects of the conversation that led to your decision.

Ensure your assessment is fair, objective, and based on the user's actual needs rather than cost considerations.
"""

chat_template_triage_support_level = ChatPromptTemplate(
    [
        ("system", system_triage_support_level),
        ("human", user_triage_support_level),
    ]
)


#
# Judge prompts 
# 

system_triage_judge = """You are a helpful support expert which provides feedback to another support agent in terms of support level and severity of an user request.
Keep in mind that you should be critical on the evaluation of the previous agent but if the previous agent did a good assessment you can answer with 'Ok'
Note that you should be very cautious by escalating the support level and severity! Generally: the lower the better
"""

user_triage_judge = """ 
The support agent came to the following conclusion: '{incident_assessment}' of the user query: '{user_query}'
The agent used the following messages: {chat_history}
Please provide your feedback!
"""


chat_template_triage_judge = ChatPromptTemplate(
    [
        ("system", system_triage_judge),
        ("human", user_triage_judge),
    ]
)

#
# Ticket generation prompt
#

system_ticket = """You are a support ticket specialist. Your role is to create clear, actionable support tickets based on triage assessments.

Your goal is to:
1. Transform the assessment into a professional, well-structured ticket
2. Provide sufficient context for the support team to act immediately


TICKET QUALITY STANDARDS:
- Title should be specific and descriptive (5-10 words max)
- Description should include: what the user is trying to do, what's happening, and relevant context
"""

user_ticket = """
ASSESSMENT RESULT:
User Issue: {user_issue}
Severity Level: {severity}
Triage Reason: {reason}

ORIGINAL CONVERSATION:
User Query: {user_query}
Chat History: {chat_history}

CREATE A SUPPORT TICKET:

1. **Title**: A concise, descriptive title that a support agent will immediately understand

2. **Description**: Write a detailed description that includes:
   - What the user is trying to accomplish
   - What problem they're experiencing
   - Any relevant technical details or context from the conversation
   - User's technical level/background (if apparent)

3. **Next Steps**: Provide 2-3 concrete recommended actions the support agent should take to resolve this issue.

Ensure the ticket is thorough enough that a support agent can begin work without requesting clarification.
"""

chat_template_ticket_creation = ChatPromptTemplate(
    [
        ("system", system_ticket),
        ("human", user_ticket),
    ]
)

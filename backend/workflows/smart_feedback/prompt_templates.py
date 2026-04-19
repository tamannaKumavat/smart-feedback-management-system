from langchain_core.prompts import ChatPromptTemplate

system_analysis_agent: str = """ You are a professional support agent to asses the user query in terms of the intent, sentiment, urgency and issue type."""

user_analysis_agent: str = """ 
Please review the following user query and assess it very carefully:

User question:
{user_query}
"""


chat_template_analysis_agent: ChatPromptTemplate = ChatPromptTemplate(
    [("system", system_analysis_agent), ("user", user_analysis_agent)]
)

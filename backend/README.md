# Backend Documentation

## Using watsonx 

This section describes how the client needs to be setup for the usage in the LangChain framework.

### Setup Client 

The first thing you need to do, is creating an `API key` in watsonx AI and to find the project id. 

The project is important because there the billing of the tokens take place. So using one project helps to keep track of the token usage.
```python
from ibm_watsonx_ai import APIClient, Credentials

credentials = Credentials(url="https://eu-de.ml.cloud.ibm.com", api_key=INSERT_PERSONAL_API_KEY)
client = APIClient(credentials)
client.set.default_project(INSERT_PROJECT_ID) # Set the default project id. This can be found at the watsonx ai overview or at the specific project. 
```
### LangChain Chatmodel
After configuring the `APIClient`, the client can be used within the LangChain framework for inference. 
The following code shows an example of creating such a chat model.


```python
from langchain_ibm import ChatWatsonx
parameters = {
    "temperature": 0.1,
    "max_tokens": 200,
}
chat = ChatWatsonx(
    model_id="mistralai/mistral-small-3-1-24b-instruct-2503",
    watsonx_client=client, # Previously created API Client 
    params=parameters,
)
```

Now it can be used for chatting/inference.

```python 
messages = [
    (
        "system",
        "You are a nice helper which provides responses in a very concise manner.",
    ),
    (
        "human",
        "Hi, who are you?",
    ),
]
chat.invoke(messages)
```

## Using langchain workflows

The following code shows how to run a workflow using either `Ollama` or `Watsonx` chat model. These chat models can be used interchangeable.

`IMPORTANT:` The select chat model *must* support `structured output`!

```python
from backend.workflows.triage.workflow import TriageWorkflow
from langchain_ollama import ChatOllama
from langchain_ibm import ChatWatsonx

# For local testing ollama can be used 
chat_model = ChatOllama(model="hf.co/unsloth/granite-4.0-h-tiny-GGUF:Q8_0")

# Setup for watsonx ai
parameters = {
    "temperature": 0.1,
    "max_tokens": 200,
}
chat_model = ChatWatsonx(
    model_id="mistralai/mistral-small-3-1-24b-instruct-2503",
    watsonx_client=client, # Previously created API Client 
    params=parameters,
)

tw = TriageWorkflow(chat_model)

# Example for found documents from the RAG step:
#mock_documents = ["Document 4444 is needed for creating a salary management"]
# Example for not found documents from the RAG step:
mock_documents = []
t = tw.run("Do i need document 321 for the salary request?", mock_documents, True)

```


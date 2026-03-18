import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sample_feedback.json")


def load_feedback():
    with open(DATA_PATH, "r") as f:
        return json.load(f)


@router.get("/feedback")
def get_all_feedback():
    return load_feedback()


@router.get("/feedback/{case_id}")
def get_feedback(case_id: str):
    records = load_feedback()
    for record in records:
        if record["case_id"] == case_id:
            return record
    raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")


@router.post("/feedback/process/{case_id}")
def process_feedback(case_id: str):
    from watsonx_client import watsonx_client

    records = load_feedback()
    record = next((r for r in records if r["case_id"] == case_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    feedback_text = " ".join(
        msg["content"] for msg in record["conversation"] if msg["sender"] == "user"
    )

    prompt = f"""You are a feedback management agent. Analyze this feedback and return a JSON with: intent, severity (S1-S4), suggested_team, and a short proposed_response.

Feedback: {feedback_text}"""

    response = watsonx_client.generate(prompt)
    return {"case_id": case_id, "watsonx_response": response}

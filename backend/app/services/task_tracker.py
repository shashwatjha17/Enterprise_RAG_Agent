
import json
'''
## types of events that would be yielded
// Event 1: Initial task list
data: {"type": "task_list_init", "tasks": [
  {"id": 1, "description": "Analyzing query", "status": "in_progress"}
]}

// Event 2: Task completed
data: {"type": "task_completed", "task_id": 1}

// Event 3: New task added (RAG agent call)
data: {"type": "task_added", "task": {
  "id": 2,
  "description": "Searching documents for 'passport application'",
  "status": "in_progress",
  "agent": "rag_agent"
}}

// Event 4: Task completed with summary
data: {"type": "task_completed", "task_id": 2, "duration_ms": 2100,
       "summary": "Found 3 relevant chunks"}

// Event 5: Another task added (second RAG call)
data: {"type": "task_added", "task": {
  "id": 3,
  "description": "Searching documents for 'application status'",
  "status": "in_progress",
  "agent": "rag_agent"
}}

// Event 6: Task completed
data: {"type": "task_completed", "task_id": 3, "duration_ms": 1800,
       "summary": "Found 2 relevant chunks"}

// Event 7: Synthesis task
data: {"type": "task_added", "task": {
  "id": 4,
  "description": "Synthesizing final response with citations",
  "status": "in_progress"
}}

// Event 8: Task completed
data: {"type": "task_completed", "task_id": 4, "duration_ms": 500}

// Event 9: Final response
data: {"type": "final_response", "answer": "## Passport Application Status\n\n..."}

// Event 10: Stream end
data: {"type": "done"}

'''

class TaskTracker: 
    '''Wrapper around the main agent to track the tasks'''

    def __init__(self, agent):
        self.agent=agent


    async def execute_query(self, query: str):
        '''
        Execute query and stream task events via SSE (Server-Sent Events)
        Wrapper around the main agent to yield task updates
        '''

        payload_init= {"type": "task_list_init", "tasks": [
            {"id": 0, "description": "Analyzing query", "status": "in_progress"}
        ]}
        yield f"data: {json.dumps(payload_init)}\n\n"

        payload_complete = {"type": "task_completed", "task_id": 0}
        yield f"data: {json.dumps(payload_complete)}\n\n"

  
        async for event in self.agent(query):
            
            yield f"data: {json.dumps(event)}\n\n"

        done_payload={"type": "done"}
        yield f"data: {json.dumps(done_payload)}\n\n"
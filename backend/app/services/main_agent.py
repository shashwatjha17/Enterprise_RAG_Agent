
from app.services.rag_agent import RAGAgent
from app.services.sql_agent import SQLAgent
from langchain_core.tools  import tool
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage, SystemMessage
import logging
import asyncio  # For running sync functions in async context
logger = logging.getLogger(__name__)

class MainAgent():
    '''
    main orchestrator of the rag pipeline
    '''

    def __init__(self, supabase_url:str , supabase_anon_key: str , token: str, sqlite_dbs: dict, db_temp_path:str, top_k:int=3 ):
        self.supabase_url=supabase_url
        self.supabase_anon_key=supabase_anon_key
        self.token=token
        self.top_k=top_k
        self.sqlite_dbs=sqlite_dbs
        self.dbs_path=db_temp_path
        self.task_counter=0

        self.main_agent_prompt="""
        You are the **Main Orchestrator Agent** in a multi-agent RAG (Retrieval-Augmented Generation) system.
        Your mission is to answer user queries with maximum accuracy and completeness by intelligently
        coordinating specialized sub-agents.

        ═══════════════════════════════════════════════════════════════════════════════
        ## IMPORTANT CONTEXT
        ═══════════════════════════════════════════════════════════════════════════════

        **CRITICAL UNDERSTANDING:**
        - You have access to the user's PERSONAL uploaded documents and databases
        - The user is asking about THEIR OWN data that they have uploaded to the system
        - You are NOT accessing external systems or third-party data
        - You MUST use your tools to search through the user's uploaded content
        - NEVER refuse to answer by saying "I can't access personal data" - you CAN and SHOULD access it via your tools!

        **Examples of what you SHOULD do:**
         User: "What is my passport application status?"
           → Call rag_agent_tool("passport application status")
           → Search their uploaded documents for this information

         User: "How many transactions do I have?"
           → Call sql_agent_tool("count all transactions")
           → Query their uploaded database

        ❌ **What you should NEVER do:**
        ❌ Refuse by saying "I cannot access personal information"
        ❌ Suggest they visit external websites
        ❌ Answer without calling tools first

        ═══════════════════════════════════════════════════════════════════════════════
        ## YOUR TOOLS
        ═══════════════════════════════════════════════════════════════════════════════

        You have access to TWO specialized agents:

        ### 1. **sql_agent_tool(query: str)** → Structured Data Retrieval
        - **Purpose**: Query SQLite databases containing structured/tabular data
        - **Input**: Natural language query (NOT SQL code)
        - **Output**: Formatted results from database queries with context
        - **Use when**: User asks about data that would be in databases (numbers, records, structured info)
        - **Examples**:
          - "How many employees in sales department?"
          - "Revenue trends for Q3 2024"
          - "List all products above $100"

        ### 2. **rag_agent_tool(query: str)** → Document/Semantic Search
        - **Purpose**: Retrieve relevant chunks from uploaded documents (PDFs, DOCs, etc.)
        - **Input**: Natural language query
        - **Output**: Retrieved text chunks with inline source citations
        - **Use when**: User asks about unstructured text, policies, descriptions, narratives
        - **Examples**:
          - "What is the company's vacation policy?"
          - "Summarize the Q3 financial report"
          - "What are the main risks mentioned?"

         **CRITICAL**: You NEVER access data directly. You MUST use these tools to retrieve information.

        ═══════════════════════════════════════════════════════════════════════════════
        ## ORCHESTRATION STRATEGY: ITERATIVE & INTELLIGENT
        ═══════════════════════════════════════════════════════════════════════════════

        ### Step 1: Query Analysis
        When you receive a user query, first determine:
        - **What information is needed?** (Break down complex questions)
        - **Which agent(s) should handle it?**
          - Structured/quantitative data → SQL Agent
          - Unstructured/qualitative info → RAG Agent
          - Combination → Use BOTH agents
        - **What are the key entities/concepts?** (dates, names, metrics, etc.)

        ### Step 2: Intelligent Tool Calling
        - **Call agents strategically**: Don't blindly call both—only use what's needed
        - **Refine queries for each agent**:
          - SQL Agent: Be specific about metrics, filters, time periods
          - RAG Agent: Use semantic queries, keywords, synonyms
        - **Iterate based on results**:
          - If results are incomplete → Reformulate and retry
          - If results are empty → Try broader/narrower queries
          - If results contradict → Call again to clarify

        ### Step 3: After EACH Tool Call
        Evaluate the response:
        ```
        ✓ What did I learn?
        ✓ What's still missing?
        ✓ Do I need to call another agent?
        ✓ Should I refine my query and retry?
        ```

        **Continue calling tools until you have comprehensive information.**

        ### Step 4: Response Synthesis
        Once you have all necessary information:
        - Combine results from both agents intelligently
        - Resolve any contradictions or inconsistencies
        - Structure your answer clearly with markdown formatting
        - **Always cite sources** (inline for RAG results, mention SQL tables/databases)

        ═══════════════════════════════════════════════════════════════════════════════
        ## ADVANCED ORCHESTRATION PATTERNS
        ═══════════════════════════════════════════════════════════════════════════════

        ### Pattern 1: Sequential Refinement
        ```
        User: "What products sold best last quarter?"

        Step 1: SQL Agent → Get product sales numbers
        Step 2: RAG Agent → Get product descriptions/details
        Step 3: Synthesize → Combine quantitative + qualitative data
        ```

        ### Pattern 2: Parallel Investigation
        ```
        User: "Analyze Q3 performance"

        Parallel calls:
        - SQL Agent: "Q3 revenue, expenses, profit metrics"
        - RAG Agent: "Q3 financial report summary and commentary"

        Then combine both perspectives
        ```

        ### Pattern 3: Iterative Deepening
        ```
        User: "Why did revenue drop in August?"

        Step 1: SQL Agent → "August revenue data"
        Step 2: (If SQL shows drop) RAG Agent → "August business reports, challenges"
        Step 3: (If needed) SQL Agent → "Compare August to previous months"
        ```

        ### Pattern 4: Cross-Validation
        ```
        If SQL Agent and RAG Agent give conflicting info:
        - Call both again with refined queries
        - Explicitly note the discrepancy in your answer
        - Present both perspectives with sources
        ```

        ═══════════════════════════════════════════════════════════════════════════════
        ## RESPONSE FORMAT
        ═══════════════════════════════════════════════════════════════════════════════
        Your final answer should be written in a way as an assistant would respond to a user.
        Your final answer should be nicely formatted in markdown including these sections:
        
        ## [Direct Answer to User's Question]

        [Concise answer in 1-3 sentences]

        ### Details

        [Comprehensive explanation using data from both agents]
        - Use **markdown formatting** (bold, lists, tables)
        - Include **inline citations**: [Source: filename.pdf] or [Source: database_name]
        - Present quantitative data clearly (numbers, percentages, trends)

        ### Sources
        **Documents:**
        - filename1.pdf
        - filename2.docx

        **Databases:**
        - database_name.sqlite (Table: table_name)

        ════════════════════════════════════════════════════════════════════════════
        ## CRITICAL RULES
        ═══════════════════════════════════════════════════════════════════════════════

        🔴 **MUST DO:**
        1. **ALWAYS call at least one tool** - NEVER answer without using tools first
        2. **Call tools multiple times** if initial results are incomplete
        3. **Evaluate after each tool call** - what's missing?
        4. **Cite all sources** - never make unsupported claims
        5. **Use both agents** when query needs structured + unstructured data
        6. **Format responses in markdown** - make them readable
        7. **Prioritize recall over precision** - better to have extra info than miss key details

        🔴 **NEVER DO:**
        1. **NEVER refuse to search the user's data** - you have full access via tools
        2. **Never write SQL yourself** - always use sql_agent_tool
        3. **Never stop after zero tool calls** - you MUST use tools
        4. **Never make up information** - only use tool results
        5. **Never skip source citations**
        6. **Never return raw tool outputs** - synthesize and format them
        7. **Never ignore empty results** - try different query formulations
        8. **Never suggest external websites** - search the uploaded data first

        ═══════════════════════════════════════════════════════════════════════════════
        ## SPECIAL CASES
        ═══════════════════════════════════════════════════════════════════════════════

        **If no relevant data found:**
        ```markdown
        I searched both the databases and documents but could not find specific information about [topic].

        However, here's what I found related to your query:
        [Any tangentially relevant info]

        **Sources searched:**
        - Documents: [list]
        - Databases: [list]
        ```

        **If data contradicts:**
        ```markdown
        ⚠️ **Note:** I found conflicting information:

        **According to database records:** [SQL result] [Source: db_name]
        **According to documents:** [RAG result] [Source: filename]

        [Your analysis of the discrepancy]
        ```

        **If query is ambiguous:**
        Ask clarifying questions before calling tools:
        ```
        To provide an accurate answer, I need clarification:
        - Do you mean [interpretation A] or [interpretation B]?
        - What time period are you interested in?
        - Which specific [entity] are you referring to?
        ```

        ═══════════════════════════════════════════════════════════════════════════════

        Now orchestrate the agents to answer the user's query comprehensively and accurately!
        """

        self.rag_agent=RAGAgent(supabase_url, supabase_anon_key, token)
        self.sql_agent=SQLAgent(self.dbs_path)

    @tool
    def rag_agent_tool(self, query: str) -> str:
        """
        Takes in the query for rag search
        Returns content with sources used
        """
        res=self.rag_agent(query)

        return res
    
    @tool 
    def sql_agent_tool(self, query: str)-> str: 
        """
        Takes in the query in natural language
        Runs sql queries and returns the information retrieved from the user's .sqlite databases
        """
        response=self.sql_agent(query, self.sqlite_dbs)

        return response


    async def __call__(self, query: str):
        """
        Takes in the user's query in natural language
        Uses sql_agent and rag_agent to retrieve information from the knowledge base
        Yields task events as it executes

        ASYNC GENERATOR EXPLANATION:
        - 'async def' = coroutine function (can use await)
        - 'yield' = generator (can iterate with for/async for)
        - Combined = async generator (iterate with 'async for')
        - Allows non-blocking I/O (LLM calls don't block other requests)
        """

        model=ChatOpenAI(model="gpt-4o-mini")
        model_with_tools=model.bind_tools([self.rag_agent_tool, self.sql_agent_tool])
        sys_message=SystemMessage(content=self.main_agent_prompt)
        hum_message=HumanMessage(content=query)
        history=[sys_message, hum_message]


        response=""
        while True:

            ai_response = await model_with_tools.ainvoke(history)
            history.append(ai_response) 
            
            
            flag=False
            if ai_response.tool_calls:
                tool_messages_to_add = []
                
                for tool_call in ai_response.tool_calls:
                    self.task_counter+=1
                    #print("Tool Called with id: ", tool_call['id'],tool_call['name'], "-"*100)
                    if tool_call['name'] == 'sql_agent_tool':
                        logger.info(f"Calling SQL Agent Tool with query: {tool_call['args']['query']}")

                        ## creating sse event for task added
                        task_id=self.task_counter
                        payload={"type": "task_added", "task": {
                          "id": task_id,
                          "description": f"Sql agent called with: {tool_call['args']['query']}",
                          "status": "in_progress",
                          "agent": "sql_agent"
                        }}
                        yield payload

                        tool_result = await asyncio.to_thread(
                            self.sql_agent_tool.func, self, tool_call['args']['query']
                        )

                        payload={"type": "task_completed", "task_id": task_id}
                        yield payload
                        
                        logger.info(f"SQL Agent Tool result: {tool_result}")
                        #print(tool_result,'\n\n\n')

                    elif tool_call['name']=='rag_agent_tool':
                        logger.info(f"Calling RAG Agent Tool with query: {tool_call['args']['query']}")
                        task_id=self.task_counter
                        payload={"type": "task_added", "task": {
                          "id": task_id,
                          "description": f"RAG agent called with: {tool_call['args']['query']}",
                          "status": "in_progress",
                          "agent": "rag_agent"
                        }}
                        yield payload

                  
                        tool_result = await asyncio.to_thread(
                            self.rag_agent_tool.func, self, tool_call['args']['query']
                        )

                        payload={"type": "task_completed", "task_id": task_id}
                        yield payload
                        logger.info(f"RAG Agent Tool result: {tool_result}")
                    #elif tool_call['name']=='workflow_over':
                    #    flag=True
                    #    break 
                    else:
                        tool_result = f"Error: Unknown tool {tool_call['name']}"
                    
                    tool_messages_to_add.append(
                        ToolMessage(content=str(tool_result), tool_call_id=tool_call['id'])
                    )
                
                history.extend(tool_messages_to_add)
            else:
                
                self.task_counter+=1
                task_id=self.task_counter
                payload={"type": "task_added", "task": {
                  "id": task_id,
                  "description": f"Main agent synthesizing final response",
                  "status": "in_progress"
                }}
                yield payload
                print('AI Message', '*'*50)
                print(ai_response.content, '\n\n\n')
                ai_message=AIMessage(content=ai_response.content)
                response=ai_response.content
                history.append(ai_message)
                payload={"type": "task_completed", "task_id": task_id}
                yield payload
                payload={"type": "final_response", "answer": response}
                yield payload
                break
            if(flag):
                break

        # print("\n\nFinal Response: \n\n", response)
        











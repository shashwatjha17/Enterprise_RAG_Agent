
from langchain_core.tools import tool 

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage, SystemMessage
from app.core.config import openai_api_key, supabase_anon_key, supabase_url
from app.services.embedding_service import EmbeddingService
import logging
import requests
logger = logging.getLogger(__name__)

embedding_service = EmbeddingService(model="text-embedding-3-small")

class RAGAgent():
    '''
    class for the RAG agent
    '''

    def __init__(self, supabase_url:str , supabase_anon_key: str , token: str, top_k:int=3):
        self.supabase_url=supabase_url
        self.supabase_anon_key=supabase_anon_key
        self.token=token
        self.top_k=top_k

        self.rag_agent_prompt="""
        You are an Enterprise RAG (Retrieval-Augmented Generation) Agent. Your mission is to answer user queries
        by retrieving and synthesizing information from uploaded documents with maximum recall and accuracy.

        ═══════════════════════════════════════════════════════════════════════════════
        ## YOUR TOOL
        ═══════════════════════════════════════════════════════════════════════════════

        You have access to ONE tool:

        **retrieval_tool(query: str)** → Retrieves the top 7 most relevant document chunks using semantic search

        Each chunk returned contains:
        - `content`: The actual text from the document
        - `metadata`: Information including filename, chunk index, etc.
        - `similarity`: Relevance score

        ═══════════════════════════════════════════════════════════════════════════════
        ## CORE RETRIEVAL STRATEGY: PRIORITIZE RECALL
        ═══════════════════════════════════════════════════════════════════════════════

        **Your goal is MAXIMUM RECALL** — it's better to retrieve extra information than to miss relevant details.

        ### MANDATORY RETRIEVAL PROCESS:

        1. **Initial Retrieval (REQUIRED)**
           - Call retrieval_tool with the user's original query
           - Analyze what you got and what might be missing

        2. **Query Reformulation (Try at least 2-3 variations)**
           You MUST try multiple retrieval strategies:

           a) **Synonym-based queries**
              - Replace key terms with synonyms
              - Example: "revenue" → "income", "sales", "earnings"

           b) **Broader queries**
              - Generalize specific terms
              - Example: "Q4 2023 revenue" → "2023 financial performance"

           c) **Narrower queries**
              - Focus on specific aspects
              - Example: "company performance" → "quarterly revenue trends"

           d) **Keyword extraction**
              - Convert questions to core keywords
              - Example: "What were the main risks?" → "risks challenges threats"

           e) **Sub-query decomposition (for complex questions)**
              - Break multi-part questions into separate retrievals
              - Example: "How did revenue and expenses change?" →
                  1. "revenue growth trends"
                  2. "expense changes costs"

        3. **Iterative Refinement**
           After EACH retrieval call:
           - Review the chunks you received
           - Identify gaps: What aspects of the question are not yet covered?
           - Formulate a NEW query targeting those gaps
           - Continue until you've exhausted reasonable query variations (minimum 2-3 calls)

        4. **Stopping Criteria**
           Stop retrieving when:
           - You've tried at least 2-3 different query formulations
           - Recent retrievals return chunks you've already seen (repetition)
           - You're confident you have comprehensive coverage of the question

           **DO NOT stop after just one retrieval call unless extremely simple query!**

        ═══════════════════════════════════════════════════════════════════════════════
        ## RESPONSE GENERATION GUIDELINES
        ═══════════════════════════════════════════════════════════════════════════════

        Once you've gathered sufficient information, generate a well-structured response:

        ### FORMATTING REQUIREMENTS:

        ✓ **Use Markdown formatting**
          - Headings (##, ###) for sections
          - **Bold** for emphasis
          - Bullet points or numbered lists for clarity
          - Tables for structured data if applicable

        ✓ **Inline source citations**
          - Cite sources immediately after claims: `[Source: filename.pdf]`
          - If chunk has page numbers, include them: `[Source: report.pdf, page 5]`
          - Example: "Revenue grew 15% in Q4 [Source: financial_report.pdf]"

        ✓ **Clear structure**
          - Start with a direct answer to the question
          - Provide supporting details with citations
          - End with a "Sources" section listing all documents used

        ### HANDLING EDGE CASES:

        **If no relevant chunks found after multiple attempts:**
        ```
        I searched the available documents but could not find specific information about [topic].

        However, I found the following related information:
        [Summarize whatever chunks you did retrieve]

        **Sources:** [list sources]
        ```

        **If chunks contradict each other:**
        ```
         **Note:** The documents contain conflicting information on this topic:

        - Document A states: [claim] [Source: doc_a.pdf]
        - Document B states: [different claim] [Source: doc_b.pdf]

        [Provide both perspectives with clear attribution]
        ```

        **If question is partially answered:**
        - Answer what you can with citations
        - Explicitly state what information is missing
        - Don't speculate beyond the retrieved content

        ═══════════════════════════════════════════════════════════════════════════════
        ## RESPONSE TEMPLATE
        ═══════════════════════════════════════════════════════════════════════════════

        Your final response should follow this structure:

        ```markdown
        ## [Direct Answer to Question]

        [Concise summary with inline citations]

        ### Details

        [Comprehensive explanation with organized sections, citations after each claim]

        ### Sources
        - filename1.pdf
        - filename2.docx
        ```

        ═══════════════════════════════════════════════════════════════════════════════
        ## CRITICAL REMINDERS
        ═══════════════════════════════════════════════════════════════════════════════

         **MUST DO:**
        - Call retrieval_tool at least 2-3 times with different query formulations
        - Cite sources inline using [Source: filename] format
        - Format response in clean markdown
        - Prioritize recall over precision (better to have extra info than miss relevant details)

         **NEVER DO:**
        - Stop after just one retrieval call (unless extremely trivial query)
        - Make claims without citing sources
        - Speculate or add information not present in retrieved chunks
        - Return plain text without markdown formatting

        ═══════════════════════════════════════════════════════════════════════════════

        Now process the user's query using this systematic approach. Start by calling retrieval_tool!
        """
    
    @tool
    def retrieval_tool(self, query: str) -> List[Dict]:
            """
            Retrieve most relevant chunks using vector similarity search.

            Args:
                query: the natural language query to search for

            Returns:
                List of chunks with similarity scores and metadata
            """
            query_embedding = embedding_service.embed_query(query)

            url = f"{self.supabase_url}/rest/v1/rpc/match_chunks"
            headers = {
                "apikey": self.supabase_anon_key,
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }

            payload = {
                "query_embedding": query_embedding,
                #"match_threshold": 1 - similarity_threshold,  
                "match_count": self.top_k
            }


            try:
                #logger.info(f"Calling match_chunks RPC with top_k={top_k}, user_id={user_id}")
                resp = requests.post(url, json=payload, headers=headers)

                
                if resp.status_code != 200:
                    logger.error(f"RPC error response: {resp.text}")

                resp.raise_for_status()
                chunks = resp.json()
                #print("retrieved chunks: \n\n")
                #for chunk in chunks: 
                #    print(chunk)
                #    print("\n\n"+'='*250+"\n\n")
                return chunks
            except Exception as e: 
                logger.error(f"Failed to retrieve chunks: {e}")
                print(f"Failed to retrieve chunks: {str(e)}")   
                raise Exception(f"Failed to retrieve chunks: {str(e)}")
    
    @tool
    def workflow_over():
        """
        dead state function
        this tool is to be called when the agent has given its final response and wants to quit
        """
        print("appel a day keeps doctor away")


    def __call__(self,query:str)->str:
        '''
         Takes in the query for rag search
         Returns content with sources used
        '''
        model=ChatOpenAI(model="gpt-4o-mini")
        model_with_tools=model.bind_tools([self.retrieval_tool, self.workflow_over])
        sys_message=SystemMessage(content=self.rag_agent_prompt)
        hum_message=HumanMessage(content=query)
        history=[sys_message, hum_message]


        response=""
        while True:
            
            ai_response = model_with_tools.invoke(history)
            history.append(ai_response) 
            
            
            flag=False
            if ai_response.tool_calls:
                tool_messages_to_add = []
                
                for tool_call in ai_response.tool_calls:
                    #print("Tool Called with id: ", tool_call['id'],tool_call['name'], "-"*100)
                    if tool_call['name'] == 'retrieval_tool':

                        tool_result=self.retrieval_tool.func(self, tool_call['args']['query'])
                        
                        #print(tool_result,'\n\n\n')
                    
                    elif tool_call['name']=='workflow_over':
                        flag=True
                        break 
                    else:
                        tool_result = f"Error: Unknown tool {tool_call['name']}"
                    
                    tool_messages_to_add.append(
                        ToolMessage(content=str(tool_result), tool_call_id=tool_call['id'])
                    )
                
                history.extend(tool_messages_to_add)
            else:
                #print('AI Message', '*'*50)
                #print(ai_response.content, '\n\n\n')
                ai_message=AIMessage(content=ai_response.content)
                response=ai_response.content
                history.append(ai_message)
                break  # Exit loop when model gives final response without tool calls
            if(flag):
                break

       # print("\n\nFinal Response: \n\n", response)
        return response

             



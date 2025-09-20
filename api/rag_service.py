"""
RAG (Retrieval-Augmented Generation) service using the aimakerspace library.
This service handles PDF processing, vector storage, and context retrieval for chat responses.
"""

import os
import tempfile
import asyncio
from typing import List, Dict, Optional, Tuple
from pathlib import Path

# Import local components (copied from aimakerspace)
from text_utils import PDFLoader, CharacterTextSplitter
from vectordatabase import VectorDatabase
from openai_utils.embedding import EmbeddingModel
from openai_utils.chatmodel import ChatOpenAI

class RAGService:
    """Service for handling PDF-based RAG operations."""
    
    def __init__(self, openai_api_key: str):
        """Initialize the RAG service with OpenAI API key."""
        self.openai_api_key = openai_api_key
        self.vector_db: Optional[VectorDatabase] = None
        self.embedding_model: Optional[EmbeddingModel] = None
        self.chat_model: Optional[ChatOpenAI] = None
        self.text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.uploaded_documents: List[str] = []  # Store document chunks for reference
        
        # Set up OpenAI API key for aimakerspace components
        os.environ["OPENAI_API_KEY"] = openai_api_key
        
    async def initialize_models(self):
        """Initialize the embedding and chat models."""
        try:
            self.embedding_model = EmbeddingModel()
            self.chat_model = ChatOpenAI(model_name="gpt-4o-mini")
            print("RAG models initialized successfully")
        except Exception as e:
            print(f"Error initializing RAG models: {e}")
            raise
    
    async def process_pdf(self, pdf_file_path: str) -> Dict[str, any]:
        """
        Process a PDF file and create vector embeddings.
        
        Args:
            pdf_file_path: Path to the PDF file
            
        Returns:
            Dictionary with processing results
        """
        try:
            if not self.embedding_model:
                await self.initialize_models()
            
            # Load PDF content
            pdf_loader = PDFLoader(pdf_file_path)
            pdf_loader.load_file()
            
            if not pdf_loader.documents:
                raise ValueError("No content extracted from PDF")
            
            # Extract text from PDF
            pdf_text = pdf_loader.documents[0]
            if not pdf_text.strip():
                raise ValueError("PDF appears to be empty or contains no extractable text")
            
            # Split text into chunks
            text_chunks = self.text_splitter.split(pdf_text)
            print(f"Split PDF into {len(text_chunks)} chunks")
            
            # Create vector database
            self.vector_db = VectorDatabase(self.embedding_model)
            await self.vector_db.abuild_from_list(text_chunks)
            
            # Store chunks for reference
            self.uploaded_documents = text_chunks
            
            return {
                "success": True,
                "chunks_created": len(text_chunks),
                "total_characters": len(pdf_text),
                "message": f"Successfully processed PDF with {len(text_chunks)} chunks"
            }
            
        except Exception as e:
            print(f"Error processing PDF: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to process PDF"
            }
    
    async def search_relevant_context(self, query: str, k: int = 3) -> List[str]:
        """
        Search for relevant context chunks based on the query.
        
        Args:
            query: User's question/query
            k: Number of relevant chunks to retrieve
            
        Returns:
            List of relevant text chunks
        """
        if not self.vector_db:
            return []
        
        try:
            relevant_chunks = self.vector_db.search_by_text(
                query_text=query,
                k=k,
                return_as_text=True
            )
            return relevant_chunks
        except Exception as e:
            print(f"Error searching for relevant context: {e}")
            return []
    
    async def generate_rag_response(self, query: str, k: int = 3) -> str:
        """
        Generate a response using RAG (Retrieval-Augmented Generation).
        
        Args:
            query: User's question
            k: Number of context chunks to retrieve
            
        Returns:
            Generated response based on retrieved context
        """
        if not self.vector_db or not self.chat_model:
            return "RAG system not initialized. Please upload a PDF first."
        
        try:
            # Retrieve relevant context
            relevant_chunks = await self.search_relevant_context(query, k)
            
            if not relevant_chunks:
                return "I couldn't find relevant information in the uploaded document to answer your question."
            
            # Combine context chunks
            context = "\n\n".join(relevant_chunks)
            
            # Create system message with context
            system_message = f"""You are a helpful assistant that answers questions based ONLY on the provided context from an uploaded document. 

IMPORTANT RULES:
1. Only use information from the provided context below to answer questions
2. If the answer cannot be found in the context, say "I cannot find that information in the uploaded document"
3. Be specific and cite relevant parts of the document when possible
4. If asked about something not in the document, politely explain that you can only answer questions about the uploaded content

CONTEXT FROM DOCUMENT:
{context}

Now answer the user's question based on this context:"""
            
            # Generate response
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
            
            response = self.chat_model.run(messages, text_only=True)
            return response
            
        except Exception as e:
            print(f"Error generating RAG response: {e}")
            return f"Error generating response: {str(e)}"
    
    async def generate_rag_response_stream(self, query: str, k: int = 3):
        """
        Generate a streaming RAG response.
        
        Args:
            query: User's question
            k: Number of context chunks to retrieve
            
        Yields:
            Chunks of the generated response
        """
        if not self.vector_db or not self.chat_model:
            yield "RAG system not initialized. Please upload a PDF first."
            return
        
        try:
            # Retrieve relevant context
            relevant_chunks = await self.search_relevant_context(query, k)
            
            if not relevant_chunks:
                yield "I couldn't find relevant information in the uploaded document to answer your question."
                return
            
            # Combine context chunks
            context = "\n\n".join(relevant_chunks)
            
            # Create system message with context
            system_message = f"""You are a helpful assistant that answers questions based ONLY on the provided context from an uploaded document. 

IMPORTANT RULES:
1. Only use information from the provided context below to answer questions
2. If the answer cannot be found in the context, say "I cannot find that information in the uploaded document"
3. Be specific and cite relevant parts of the document when possible
4. If asked about something not in the document, politely explain that you can only answer questions about the uploaded content

CONTEXT FROM DOCUMENT:
{context}

Now answer the user's question based on this context:"""
            
            # Generate streaming response
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
            
            async for chunk in self.chat_model.astream(messages):
                yield chunk
                
        except Exception as e:
            print(f"Error generating streaming RAG response: {e}")
            yield f"Error generating response: {str(e)}"
    
    def get_status(self) -> Dict[str, any]:
        """Get the current status of the RAG service."""
        return {
            "vector_db_initialized": self.vector_db is not None,
            "embedding_model_initialized": self.embedding_model is not None,
            "chat_model_initialized": self.chat_model is not None,
            "documents_uploaded": len(self.uploaded_documents),
            "total_chunks": len(self.uploaded_documents) if self.uploaded_documents else 0
        }
    
    def clear_documents(self):
        """Clear all uploaded documents and reset the vector database."""
        self.vector_db = None
        self.uploaded_documents = []
        print("RAG service cleared - all documents removed")


# Global RAG service instance (will be initialized per user session)
rag_services: Dict[str, RAGService] = {}

def get_rag_service(user_id: str, openai_api_key: str) -> RAGService:
    """Get or create a RAG service for a specific user."""
    if user_id not in rag_services:
        rag_services[user_id] = RAGService(openai_api_key)
    return rag_services[user_id]

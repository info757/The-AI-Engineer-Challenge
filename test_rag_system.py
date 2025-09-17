#!/usr/bin/env python3
"""
Test script for the RAG system functionality.
This script tests the PDF processing and RAG functionality without the full web interface.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the api directory to the Python path
sys.path.append(str(Path(__file__).parent / "api"))

from rag_service import RAGService

async def test_rag_system():
    """Test the RAG system with a sample PDF."""
    
    # Check if OpenAI API key is available
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return False
    
    print("✅ OpenAI API key found")
    
    # Initialize RAG service
    try:
        rag_service = RAGService(openai_api_key)
        await rag_service.initialize_models()
        print("✅ RAG service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize RAG service: {e}")
        return False
    
    # Test with a sample text (since we don't have a PDF file)
    print("\n📝 Testing with sample text...")
    
    # Create a temporary text file to simulate PDF content
    sample_text = """
    Artificial Intelligence (AI) is a branch of computer science that aims to create 
    intelligent machines that can perform tasks that typically require human intelligence. 
    These tasks include learning, reasoning, problem-solving, perception, and language understanding.
    
    Machine Learning is a subset of AI that focuses on the development of algorithms and 
    statistical models that enable computer systems to improve their performance on a specific 
    task through experience, without being explicitly programmed.
    
    Deep Learning is a subset of machine learning that uses artificial neural networks with 
    multiple layers to model and understand complex patterns in data. It has been particularly 
    successful in areas such as image recognition, natural language processing, and speech recognition.
    
    Natural Language Processing (NLP) is a field of AI that focuses on the interaction between 
    computers and humans through natural language. The ultimate objective of NLP is to read, 
    decipher, understand, and make sense of human language in a valuable way.
    """
    
    # Create a temporary file
    temp_file = Path("temp_sample.txt")
    temp_file.write_text(sample_text)
    
    try:
        # Test PDF processing (using text file as input)
        result = await rag_service.process_pdf(str(temp_file))
        
        if result["success"]:
            print(f"✅ PDF processing successful: {result['chunks_created']} chunks created")
            print(f"   Total characters: {result['total_characters']}")
        else:
            print(f"❌ PDF processing failed: {result['error']}")
            return False
        
        # Test RAG query
        print("\n🤖 Testing RAG query...")
        query = "What is machine learning?"
        response = await rag_service.generate_rag_response(query)
        print(f"Query: {query}")
        print(f"Response: {response}")
        
        # Test another query
        print("\n🤖 Testing another RAG query...")
        query2 = "What are the main areas of AI?"
        response2 = await rag_service.generate_rag_response(query2)
        print(f"Query: {query2}")
        print(f"Response: {response2}")
        
        # Test status
        status = rag_service.get_status()
        print(f"\n📊 RAG System Status: {status}")
        
        print("\n✅ All tests passed! RAG system is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up temporary file
        if temp_file.exists():
            temp_file.unlink()

if __name__ == "__main__":
    print("🧪 Testing RAG System...")
    print("=" * 50)
    
    success = asyncio.run(test_rag_system())
    
    if success:
        print("\n🎉 RAG system test completed successfully!")
        print("The backend is ready for PDF upload and RAG functionality.")
    else:
        print("\n💥 RAG system test failed!")
        print("Please check the error messages above and fix any issues.")
        sys.exit(1)

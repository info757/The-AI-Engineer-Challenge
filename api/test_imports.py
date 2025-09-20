#!/usr/bin/env python3
"""
Test script to verify aimakerspace imports work correctly
"""

import sys
import os

print("Python path:", sys.path)
print("Current working directory:", os.getcwd())
print("Contents of /app:", os.listdir('/app') if os.path.exists('/app') else 'Not found')

try:
    print("Testing aimakerspace import...")
    from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
    print("✅ aimakerspace.text_utils import successful")
except ImportError as e:
    print(f"❌ aimakerspace.text_utils import failed: {e}")

try:
    from aimakerspace.vectordatabase import VectorDatabase
    print("✅ aimakerspace.vectordatabase import successful")
except ImportError as e:
    print(f"❌ aimakerspace.vectordatabase import failed: {e}")

try:
    from aimakerspace.openai_utils.embedding import EmbeddingModel
    print("✅ aimakerspace.openai_utils.embedding import successful")
except ImportError as e:
    print(f"❌ aimakerspace.openai_utils.embedding import failed: {e}")

print("Import test completed")

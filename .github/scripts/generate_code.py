import os
import re
from google import genai

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=api_key)
prompt = os.environ.get("USER_PROMPT", "")

# Load existing script.js if available for context
current_code = ""
if os.path.exists("script.js"):
    with open("script.js", "r", encoding="utf-8") as f:
        current_code = f.read()

full_prompt = f"""You are an automated code generator for a GitHub repository.
Existing script.js content:
```javascript
{current_code}

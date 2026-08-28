import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
prompt = os.environ["USER_PROMPT"]

# Example: Ask Gemini to generate or update script.js
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Update the project files according to this request: {prompt}. Return only clean code without markdown formatting."
)

with open("script.js", "w") as f:
    f.write(response.text)

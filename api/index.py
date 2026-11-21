import json
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from google import genai
from google.genai import types

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()
app = FastAPI()

@app.post("/api/processImage")
async def processImage(file: UploadFile = File(...)):
    img = await file.read()
    dictionary = convert(img, file.content_type or "image/png")
    return dictionary

def convert(img: bytes, mime_type: str = "image/png"):
    client = genai.Client()
    prompt = """
    You are an expert electrical engineer and CAD schematic designer.
    Analyze this hand-drawn circuit schematic and convert it into a clean, ready-to-render graph layout for a frontend canvas/flowchart diagram.
    Return ONLY a raw JSON object with a 'nodes' array and an 'edges' array matching this structure:
    {
      "nodes": [
        {
          "id": "battery_1",
          "type": "battery",
          "label": "9V Battery",
          "value": "9V",
          "x": 150,
          "y": 300,
          "pins": ["+", "-"]
        }
      ],
      "edges": [
        {
          "id": "e1",
          "from": "battery_1",
          "to": "resistor_1",
          "fromPin": "+",
          "toPin": "pin1",
          "label": "wire"
        }
      ]
    }

    LAYOUT & POSITIONING RULES (Crucial for clean frontend visualization):
    1. Coordinate Space: Fit all components within 800x600 (x: 50 to 750, y: 50 to 550).
    2. Spacing: Ensure at least 150px to 200px distance between components so connecting wires never overlap or cross through other components.
    3. Schematic Flow:
       - Place power sources (battery/VCC) on the left (x: 100-200).
       - Place ground (GND) at the bottom (y: 450-550).
       - Place loads and passive components sequentially across the center and right (x: 300-650).
    4. Terminals: For polarized components (batteries, LEDs, capacitors), strictly specify polarity on fromPin/toPin ('+' / '-' or 'anode' / 'cathode').
    """
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=[
            types.Part.from_bytes(data=img, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    return json.loads(response.text)

#!/usr/bin/env python
"""Startup script to ensure Flask server runs from correct directory."""
import os
import sys
import subprocess

# Ensure we run from the pyserver directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

print(f"Starting Flask server from: {SCRIPT_DIR}")
print(f"Excel file: {os.path.join(SCRIPT_DIR, 'vessel_data.xlsx')}")

# Start the Flask app
subprocess.run([sys.executable, 'app.py'])

import json
import os
from app.config.paths import DB_PATH


def load_db():
    """Load the panel configuration database from JSON file."""
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w") as f:
            json.dump({"panels": []}, f)
    with open(DB_PATH, "r") as f:
        return json.load(f)


def save_db(data):
    """Save data to the panel configuration database JSON file."""
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2) 
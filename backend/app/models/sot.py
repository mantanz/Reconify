from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class SOTUpload(BaseModel):
    doc_id: str
    doc_name: str
    uploaded_by: str
    timestamp: str
    status: str
    sot_type: str
    error: Optional[str] = None

class SOTFields(BaseModel):
    fields: list

class SOTList(BaseModel):
    sots: list

class SOTConfig(BaseModel):
    name: str
    headers: List[str]

class SOTCreate(BaseModel):
    name: str
    headers: List[str]

class SOTUpdate(BaseModel):
    headers: List[str] 
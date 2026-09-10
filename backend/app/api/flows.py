import json
from typing import Any, Dict, List
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.database import get_db
from app.engine.core_nodes import NODE_CATALOG
from app.models.schemas import FlowResponse, FlowSaveRequest

router = APIRouter(prefix="/api/flows", tags=["flows"])

@router.get("/catalog")
async def get_node_catalog():
    """Returns all available node specifications and UI schemas."""
    return {"catalog": NODE_CATALOG}

@router.get("/{bot_id}")
async def get_flow(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT id, bot_id, name, is_active, version, nodes, edges, viewport, updated_at
        FROM flows WHERE bot_id = ? AND is_active = 1 LIMIT 1
    """, (bot_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Flow not found for this bot.")
        
    return {
        "id": row["id"],
        "bot_id": row["bot_id"],
        "name": row["name"],
        "is_active": bool(row["is_active"]),
        "version": row["version"],
        "nodes": json.loads(row["nodes"]) if row["nodes"] else [],
        "edges": json.loads(row["edges"]) if row["edges"] else [],
        "viewport": json.loads(row["viewport"]) if row["viewport"] else {"x": 0, "y": 0, "zoom": 1},
        "updated_at": str(row["updated_at"])
    }

@router.post("/{bot_id}")
async def save_flow(bot_id: int, req: FlowSaveRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, version FROM flows WHERE bot_id = ? AND is_active = 1 LIMIT 1", (bot_id,)
    )
    existing = await cursor.fetchone()
    
    nodes_json = json.dumps(req.nodes)
    edges_json = json.dumps(req.edges)
    viewport_json = json.dumps(req.viewport)
    
    if existing:
        new_version = existing["version"] + 1
        await db.execute("""
            UPDATE flows
            SET name = ?, nodes = ?, edges = ?, viewport = ?, version = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (req.name, nodes_json, edges_json, viewport_json, new_version, existing["id"]))
        flow_id = existing["id"]
    else:
        cursor = await db.execute("""
            INSERT INTO flows (bot_id, name, nodes, edges, viewport, version)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (bot_id, req.name, nodes_json, edges_json, viewport_json))
        flow_id = cursor.lastrowid
        new_version = 1
        
    await db.commit()
    return {
        "success": True,
        "flow_id": flow_id,
        "version": new_version,
        "message": "Flow saved successfully."
    }

@router.get("/{bot_id}/export")
async def export_flow(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT f.name, f.nodes, f.edges, b.name as bot_name
        FROM flows f
        JOIN bots b ON b.id = f.bot_id
        WHERE f.bot_id = ? AND f.is_active = 1 LIMIT 1
    """, (bot_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Flow not found")
        
    return {
        "format": "mybot-workflow-template",
        "version": "1.0.0",
        "bot_name": row["bot_name"],
        "flow_name": row["name"],
        "nodes": json.loads(row["nodes"]) if row["nodes"] else [],
        "edges": json.loads(row["edges"]) if row["edges"] else []
    }

@router.post("/{bot_id}/import")
async def import_flow(bot_id: int, file: UploadFile = File(...), db: aiosqlite.Connection = Depends(get_db)):
    try:
        content = await file.read()
        template = json.loads(content.decode("utf-8"))
        nodes = template.get("nodes", [])
        edges = template.get("edges", [])
        
        await db.execute("""
            UPDATE flows
            SET nodes = ?, edges = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE bot_id = ? AND is_active = 1
        """, (json.dumps(nodes), json.dumps(edges), bot_id))
        await db.commit()
        return {"success": True, "message": "Template imported successfully", "nodes_count": len(nodes)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse template file: {e}")

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os

from api.recommender import RecommenderEngine

app = FastAPI(title="Vizcaínas Library Recommendation API")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize recommender engine
# Assume running from project root
data_dir = "data"
csv_path = "synthetic_checkouts.csv"
engine = RecommenderEngine(data_dir=data_dir, csv_path=csv_path)

class CheckoutRequest(BaseModel):
    book_id: str
    title: str = None
    description: str = None

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Recommendation API is running"}

@app.get("/api/users")
def get_users():
    return engine.get_users_list()

@app.get("/api/users/{user_id}")
def get_user(user_id: str):
    user = engine.get_user_detail(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/{user_id}/recommendations")
def get_user_recommendations(user_id: str, alpha: float = Query(0.5, ge=0.0, le=1.0)):
    recs = engine.get_recommendations(user_id, alpha=alpha)
    return {
        "user_id": user_id,
        "alpha": alpha,
        "recommendations": recs
    }

@app.post("/api/users/{user_id}/checkout")
def user_checkout(user_id: str, request: CheckoutRequest):
    # Verify user exists
    if user_id not in engine.user_checkouts:
        raise HTTPException(status_code=404, detail="User not found")
        
    success = engine.add_checkout(
        user_id, 
        request.book_id, 
        title=request.title, 
        description=request.description
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add checkout")
        
    return {
        "status": "success",
        "message": f"Book {request.book_id} checked out by user {user_id}",
        "checkouts": list(engine.user_checkouts[user_id])
    }

@app.get("/api/books")
def search_books(q: str = Query(None, min_length=2)):
    if not q:
        return []
    return engine.search_books(q)

@app.get("/api/books/{book_id}")
def get_book(book_id: str):
    book = engine.get_book_details(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.get("/api/graph/{user_id}")
def get_graph_data(user_id: str, limit: int = 15):
    data = engine.get_graph_visualization_data(user_id, max_similar_users=limit)
    if not data["nodes"]:
        raise HTTPException(status_code=404, detail="User not found or has no connections")
    return data

@app.get("/api/stats")
def get_stats():
    return engine.get_stats()

@app.post("/api/reset")
def reset_checkouts():
    # Helper endpoint to reset active checkouts back to CSV baseline
    if os.path.exists(engine.active_checkouts_path):
        os.remove(engine.active_checkouts_path)
    engine.load_data()
    return {"status": "success", "message": "Checkouts reset to CSV baseline"}

# Serve static files from Vite build directory in production
if os.path.exists("web/dist"):
    app.mount("/", StaticFiles(directory="web/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

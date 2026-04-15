import asyncio
from fastapi import HTTPException
from app.core.database import teams_collection, games_collection
from app.models.schemas import TeamRegister, TeamDB, SpendHarmony, GameResult, LoginRequest
from app.services.ws_manager import ws_manager

class TeamService:
    @staticmethod
    async def register_team(team_data: TeamRegister):
        """Registers a new team into the database with default 0 stats."""
        # Check if team name already exists
        existing_team = await teams_collection.find_one({"team_name": team_data.team_name})
        if existing_team:
            raise HTTPException(status_code=400, detail="Team name already taken.")

        new_team = TeamDB(**team_data.model_dump())
        await teams_collection.insert_one(new_team.model_dump())
        return {"message": f"Team {team_data.team_name} registered successfully."}

    @staticmethod
    async def verify_login(data: LoginRequest):
        """Verifies team credentials for frontend dashboard access."""
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team or team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Invalid team name or passcode.")
            
        return {
            "status": "success", 
            "message": "Login successful",
            "team_name": team["team_name"]
        }

    @staticmethod
    async def get_leaderboard():
        """Returns the fully sorted leaderboard based on Points -> Time -> Harmony."""
        cursor = teams_collection.find({}, {"_id": 0, "passcode": 0})
        teams = await cursor.to_list(length=100)
        
        # Sort by points (desc), then net_time_diff (desc), then harmony_points (desc)
        sorted_teams = sorted(
            teams, 
            key=lambda x: (
                x.get("points", 0), 
                x.get("net_time_diff", 0.0), 
                x.get("harmony_points", 0)
            ), 
            reverse=True
        )
        return sorted_teams

    # --- IN team_service.py ---

    @staticmethod
    async def spend_harmony_points(data: SpendHarmony):
        """Deducts Harmony Points to drain the opponent's clock, highly secured."""
        
        # 1. Verify Game Context (Prevents Cross-Game Sabotage)
        game = await games_collection.find_one({"game_id": data.game_id})
        
        if not game:
            raise HTTPException(status_code=404, detail="Game not found.")
            
        if game.get("status") not in ["pending", "ongoing"]:
            raise HTTPException(status_code=400, detail="Game is already completed.")
            
        if data.team_name not in [game.get("team_a"), game.get("team_b")]:
            raise HTTPException(status_code=403, detail="Unauthorized: Your team is not playing in this match.")
            
        if data.player_number not in [1, 2]:
            raise HTTPException(status_code=400, detail="player_number must be 1 or 2.")

        # 2. Dynamic field selection based on the player making the request
        player_field = f"player_{data.player_number}_harmony"

        # 3. ATOMIC UPDATE: Check passcode, check points, and deduct all in one go
        result = await teams_collection.update_one(
            {
                "team_name": data.team_name,
                "passcode": data.passcode,
                player_field: {"$gte": data.points_to_spend} # Race condition solved here
            },
            {
                "$inc": {
                    "harmony_points": -data.points_to_spend,
                    player_field: -data.points_to_spend
                }
            }
        )

        # If modified_count is 0, the query failed (either bad passcode, or not enough points)
        if result.modified_count == 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Transaction failed. Invalid passcode or Player {data.player_number} does not have enough Harmony Points."
            )

        # 4. Calculate the time deduction (1 point = 10 seconds)
        time_to_deduct = data.points_to_spend * 10
        
        return {
            "status": "success", 
            "message": f"Deducted {data.points_to_spend} points from Player {data.player_number}.",
            "time_deduction_seconds": time_to_deduct
        }

    @staticmethod
    async def process_game_result(data: GameResult):
        """Processes the final game result, updates the leaderboard, and severs connections."""
        
        # --- 1. SECURITY CHECK ---
        if data.submitter_team not in [data.team_a, data.team_b]:
            raise HTTPException(status_code=403, detail="Submitter is not part of this game.")
            
        submitter = await teams_collection.find_one({"team_name": data.submitter_team})
        
        if not submitter or submitter.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode for submitting results.")

        # --- 2. ATOMIC RACE CONDITION CHECK ---
        # Atomically update the game status to prevent double-processing if both clients submit
        game_update_result = await games_collection.update_one(
            {"game_id": data.game_id, "status": {"$ne": "completed"}},
            {"$set": {"status": "completed", "winner": data.winner_team}}
        )

        if game_update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Game result already processed or game not found.")

        # --- 3. CALCULATE TIME DIFFERENCE ---
        team_a_net_time = data.team_a_time_left - data.team_b_time_left
        team_b_net_time = data.team_b_time_left - data.team_a_time_left

        # Prepare base database update queries (Always increment games_played and update net time)
        team_a_update = {"$inc": {"net_time_diff": team_a_net_time, "games_played": 1}}
        team_b_update = {"$inc": {"net_time_diff": team_b_net_time, "games_played": 1}}

        # --- 4. ASSIGN POINTS, WINS/LOSSES, AND HARMONY POINTS ---
        if data.is_draw:
            team_a_update["$inc"]["nr"] = 1
            team_b_update["$inc"]["nr"] = 1
            team_a_update["$inc"]["points"] = 0.5
            team_b_update["$inc"]["points"] = 0.5
            # Harmony points are not awarded in the event of a draw
        
        elif data.winner_team == data.team_a:
            team_a_update["$inc"]["wins"] = 1
            team_a_update["$inc"]["points"] = 1
            team_b_update["$inc"]["losses"] = 1
            
            # Award 2 harmony points only to the winning team if it was a modified/harmony game
            if data.harmony:
                team_a_update["$inc"]["harmony_points"] = 2
        
        elif data.winner_team == data.team_b:
            team_b_update["$inc"]["wins"] = 1
            team_b_update["$inc"]["points"] = 1
            team_a_update["$inc"]["losses"] = 1
            
            # Award 2 harmony points only to the winning team if it was a modified/harmony game
            if data.harmony:
                team_b_update["$inc"]["harmony_points"] = 2

        # --- 5. EXECUTE DATABASE UPDATES CONCURRENTLY ---
        await asyncio.gather(
            teams_collection.update_one({"team_name": data.team_a}, team_a_update),
            teams_collection.update_one({"team_name": data.team_b}, team_b_update)
        )

        # --- 6. KILL ZOMBIE WEBSOCKETS ---
        # Broadcast game over so frontends stop trying to send moves
        await ws_manager.broadcast_to_game(
            data.game_id, 
            {"type": "game_over", "winner": data.winner_team}, 
            sender=None 
        )
        
        # Aggressively sever the connection to prevent lingering state saves
        await ws_manager.force_disconnect_game(data.game_id)

        return {"status": "success", "message": "Leaderboard updated and connections closed successfully"}
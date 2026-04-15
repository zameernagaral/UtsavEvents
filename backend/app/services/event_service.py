from app.core.database import db, teams_collection
from app.services.game_service import GameService

# Create a dedicated collection for storing the global event state
event_collection = db.get_collection("event_config")

class EventService:
    # The strictly defined, linear blueprint of your new tournament flow
    PHASES = [
        "registration", 
        "mini_game_1",
        "qualifiers", 
        "elimination_cut", 
        "mini_game_2",
        "swiss_stage",            # 🔥 NEW
        "round_robin_top6",       # 🔥 NEW
        "finals", 
        "completed"
    ]

    @staticmethod
    async def get_current_phase() -> str:
        """Fetches the current active phase of the tournament from MongoDB."""
        state = await event_collection.find_one({"_id": "global_state"})
        if not state:
            # Initialize the event state if it doesn't exist yet
            await event_collection.insert_one({"_id": "global_state", "current_phase": "registration"})
            return "registration"
        return state["current_phase"]

    @staticmethod
    async def advance_phase():
        """Moves the tournament to the next phase and executes necessary background logic."""
        current = await EventService.get_current_phase()
        try:
            current_index = EventService.PHASES.index(current)
        except ValueError:
            current_index = 0

        if current_index >= len(EventService.PHASES) - 1:
            return {"status": "completed", "message": "Event is already completed."}

        next_phase = EventService.PHASES[current_index + 1]

        # --- EXECUTE PHASE TRANSITION LOGIC ---
        
        if next_phase == "qualifiers":
            # Generate the 3 random games for everyone (5+3, modified, 5+0)
            await GameService.generate_matchmaking()
            
        elif next_phase == "elimination_cut":
            # Cut the bottom half of the leaderboard after the initial qualifiers
            await EventService._execute_elimination()
            
        elif next_phase == "swiss_stage":
            from app.services.team_service import TeamService

            teams = await TeamService.get_leaderboard()
            active = [t["team_name"] for t in teams if not t.get("is_eliminated", False)]

            # 🔥 RESET HERE (14 teams)
            await EventService._reset_leaderboard(active)

            await GameService.generate_swiss_stage()

        elif next_phase == "round_robin_top6":
            top_6 = await GameService.evaluate_swiss_stage()

            # 🔥 RESET HERE (6 teams)
            await EventService._reset_leaderboard(top_6)

            await GameService.generate_round_robin_top6(top_6)

        elif next_phase == "finals":
            finalists = await GameService.evaluate_round_robin_top6()

            # 🔥 RESET HERE (2 teams)
            await EventService._reset_leaderboard(finalists)

            await GameService.generate_finals(finalists)

        # Update the database to reflect the new phase
        await event_collection.update_one(
            {"_id": "global_state"}, 
            {"$set": {"current_phase": next_phase}},
            upsert=True
        )

        return {"status": "success", "new_phase": next_phase}

    @staticmethod
    async def _execute_elimination():
        """Eliminates the bottom half of the teams after the initial qualifiers phase."""
        # Local import to prevent circular dependency issues
        from app.services.team_service import TeamService 
        
        sorted_teams = await TeamService.get_leaderboard()
        top_half_count = len(sorted_teams) // 2
        
        # Identify the bottom half of the standings
        eliminated_teams = sorted_teams[top_half_count:]
        eliminated_names = [team["team_name"] for team in eliminated_teams]

        # Mark them as eliminated in the database
        if eliminated_names:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated_names}},
                {"$set": {"is_eliminated": True}}
            )

    @staticmethod
    async def _reset_leaderboard(active_team_names: list[str]):
        """
        Resets leaderboard stats for given teams.
        """
        if not active_team_names:
            return

        await teams_collection.update_many(
            {"team_name": {"$in": active_team_names}},
            {
                "$set": {
                    "points": 0,
                    "net_time_diff": 0,
                    "wins": 0,
                    "losses": 0,
                    "nr": 0,
                    "games_played": 0
                }
            }
        )

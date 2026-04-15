import random
import uuid
from fastapi import HTTPException
from app.core.database import games_collection, teams_collection
from app.models.schemas import MinigameAnswer, GameStateUpdate, PuzzleResult

class GameService:
    # --- IN game_service.py ---

    @staticmethod
    async def verify_minigame(data: MinigameAnswer) -> dict:
        """Verifies mini-game answers and awards Harmony Points securely."""
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found.")
            
        if team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")

        correct_answers = ["queen"] 
        
        if data.answer.strip().lower() in correct_answers:
            points_earned = 2 # Or whatever value the trivia holds
            
            # --- DUAL LOGIC HANDLER ---
            if data.player_number in [1, 2]:
                # INDIVIDUAL MODE
                update_query = {
                    "harmony_points": points_earned,
                    f"player_{data.player_number}_harmony": points_earned
                }
                msg = f"Correct! {points_earned} point awarded to Player {data.player_number}."
            else:
                # TEAM MODE (Splits the point, or handles fractions if needed. 
                # Note: If points_earned is 1, integer division // 2 results in 0. 
                # You may want trivia to be worth 2 points for team mode so it splits cleanly into 1 and 1).
                update_query = {
                    "harmony_points": points_earned,
                    "player_1_harmony": points_earned // 2,
                    "player_2_harmony": points_earned // 2
                }
                msg = f"Correct! {points_earned} points awarded to the team."
            # --------------------------

            await teams_collection.update_one(
                {"team_name": data.team_name},
                {"$inc": update_query}
            )
            return {"status": "success", "message": msg}
            
        return {"status": "failure", "message": "Incorrect answer."}
    @staticmethod
    async def submit_puzzle_result(data: PuzzleResult) -> dict:
        team = await teams_collection.find_one({"team_name": data.team_name})

        if not team or team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized")

        is_perfect = int(data.puzzles_correct) == int(data.total_puzzles) == 3
        points_to_add = 2 if is_perfect else 0

        if points_to_add > 0:
            # --- DUAL LOGIC HANDLER ---
            if data.player_number in [1, 2]:
                # INDIVIDUAL MODE: All individual points go to the player who solved it
                update_query = {
                    "harmony_points": points_to_add,
                    f"player_{data.player_number}_harmony": points_to_add
                }
            else:
                # TEAM MODE: Split the individual points evenly between both players
                update_query = {
                    "harmony_points": points_to_add,
                    "player_1_harmony": points_to_add // 2,
                    "player_2_harmony": points_to_add // 2
                }
            # --------------------------

            await teams_collection.update_one(
                {"team_name": data.team_name},
                {"$inc": update_query}
            )

        return {"status": "success", "harmony_points_awarded": points_to_add}

    @staticmethod
    async def save_game_state(data: GameStateUpdate):
        """Saves the FEN string and clocks every 15 moves to prevent data loss."""
        if data.move_count % 15 == 0 or data.game_status != "ongoing":
            await games_collection.update_one(
                {"game_id": data.game_id},
                {"$set": {
                    "current_fen": data.fen_string,
                    "team_a_time": data.team_a_time,
                    "team_b_time": data.team_b_time,
                    "move_count": data.move_count,
                    "status": data.game_status
                }},
                upsert=True
            )

    @staticmethod
    async def get_game_state(game_id: str):
        """Allows a disconnected player to fetch the latest board state before reconnecting."""
        game = await games_collection.find_one({"game_id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found.")
        
        if "current_fen" not in game:
            return {"status": "new_game", "message": "No moves saved yet, start from default."}
            
        return {
            "status": "restored",
            "current_fen": game["current_fen"],
            "team_a_time": game.get("team_a_time"),
            "team_b_time": game.get("team_b_time"),
            "move_count": game.get("move_count", 0)
        }

    @staticmethod
    async def get_team_schedule(team_name: str):
        """Returns ONLY the current active round's games to prevent player confusion."""
        cursor = games_collection.find(
            {"$or": [{"team_a": team_name}, {"team_b": team_name}]},
            {"_id": 0} 
        )
        all_matches = await cursor.to_list(length=100)
        
        if not all_matches:
            return {"message": "No matches scheduled yet.", "matches": []}
            
        # Find matches that are still waiting to be played
        active_matches = [m for m in all_matches if m.get("status") in ["pending", "ongoing"]]
        
        if not active_matches:
            # If all games are completed, return everything so they can view their history
            return {"message": "All games completed", "matches": all_matches, "all_completed": True}
            
        # Find the lowest available round number (defaults to 0 for Qualifiers)
        current_round = min([m.get("round_number", 0) for m in active_matches])
        
        # Filter the list down to ONLY the current round
        current_round_matches = [m for m in active_matches if m.get("round_number", 0) == current_round]
        
        return {
            "current_round": current_round,
            "matches": current_round_matches
        }

    @staticmethod
    async def generate_matchmaking() -> list[dict]:
        """Generates 3 random 2v2 games (5+3, modified, 5+0) for the Qualifiers."""
        cursor = teams_collection.find({"is_eliminated": {"$ne": True}}, {"_id": 0, "team_name": 1})
        teams = await cursor.to_list(length=100)
        team_names = [t["team_name"] for t in teams]

        if len(team_names) < 2:
            return []

        random.shuffle(team_names)
        matches = []
        variants = ["5+3", "modified", "5+0"]

        for i in range(0, len(team_names) - 1, 2):
            team_a = team_names[i]
            team_b = team_names[i+1]
            
            # Qualifiers don't have strict rounds, so we default to round 0
            for variant in variants:
                matches.append({
                    "game_id": f"qual_{uuid.uuid4().hex[:8]}",
                    "team_a": team_a,
                    "team_b": team_b,
                    "variant": variant,
                    "stage": "qualifiers",
                    "group_id": "none",
                    "round_number": 0,
                    "status": "pending",
                    "board_number": 1
                })

        if matches:
            await games_collection.insert_many(matches)

        return matches

    # @staticmethod
    # async def generate_group_stage_1():
    #     """Splits teams into groups and generates a Strict Sequential Round Robin."""
    #     from app.services.team_service import TeamService
        
    #     all_teams = await TeamService.get_leaderboard()
    #     active_teams = [t for t in all_teams if not t.get("is_eliminated", False)]
    #     n = len(active_teams)

    #     if n < 3:
    #         return {"message": "Not enough teams to form groups."}

    #     num_groups = n // 3
    #     remainder = n % 3
        
    #     groups = {f"Group_{chr(65+i)}": [] for i in range(num_groups)}
    #     group_names = list(groups.keys())

    #     team_idx = 0
    #     for name in group_names:
    #         groups[name].extend(active_teams[team_idx : team_idx + 3])
    #         team_idx += 3
            
    #     for i in range(remainder):
    #         groups[group_names[i]].append(active_teams[team_idx])
    #         team_idx += 1

    #     # Update the database with the assigned groups
    #     for group_name, members in groups.items():
    #         for member in members:
    #             await teams_collection.update_one(
    #                 {"team_name": member["team_name"]},
    #                 {"$set": {"current_group": group_name}}
    #             )

    #     matches_by_round = {}
        
    #     # Circle Method Scheduling Algorithm
    #     for group_name, members in groups.items():
    #         member_names = [m["team_name"] for m in members]
            
    #         # Add a "BYE" dummy if odd number of teams
    #         if len(member_names) % 2 != 0:
    #             member_names.append("BYE")
                
    #         num_teams = len(member_names)
            
    #         for round_num in range(1, num_teams):
    #             # Initialize the round list if it doesn't exist yet
    #             if round_num not in matches_by_round:
    #                 matches_by_round[round_num] = []

    #             for i in range(num_teams // 2):
    #                 team_a = member_names[i]
    #                 team_b = member_names[num_teams - 1 - i]
                    
    #                 if team_a != "BYE" and team_b != "BYE":
    #                     # Add match to the specific round's queue
    #                     matches_by_round[round_num].extend(GameService._create_2x1v1(
    #                         team_a, team_b, variant="5+3", stage="group_stage_1", 
    #                         group_id=group_name, round_number=round_num
    #                     ))
                
    #             # Rotate the array for the next round (keep index 0 fixed)
    #             member_names.insert(1, member_names.pop())

    #     # Flatten the dictionary into the final chronological queue
    #     matches = []
    #     for r_num in sorted(matches_by_round.keys()):
    #         matches.extend(matches_by_round[r_num])

    #     # Bulk insert the correctly ordered matches
    #     if matches:
    #         await games_collection.insert_many(matches)

    #     return {"status": "success", "groups_created": num_groups, "matches": len(matches)}
    
    # @staticmethod
    # async def evaluate_group_stage_1() -> list[str]:
    #     """Calculates Top 1 from 3-teams and Top 2 from 4-teams, eliminates the rest."""
    #     from app.services.team_service import TeamService
    #     all_teams = await TeamService.get_leaderboard()
    #     active_teams = [t for t in all_teams if not t.get("is_eliminated", False) and t.get("current_group")]
        
    #     groups = {}
    #     for t in active_teams:
    #         grp = t["current_group"]
    #         if grp not in groups:
    #             groups[grp] = []
    #         groups[grp].append(t)
            
    #     advancing_teams = []
    #     eliminated_names = []
        
    #     for grp_name, members in groups.items():
    #         if len(members) >= 4:
    #             advancing_teams.extend([m["team_name"] for m in members[:2]])
    #             eliminated_names.extend([m["team_name"] for m in members[2:]])
    #         else:
    #             advancing_teams.extend([m["team_name"] for m in members[:1]])
    #             eliminated_names.extend([m["team_name"] for m in members[1:]])
                
    #     if eliminated_names:
    #         await teams_collection.update_many(
    #             {"team_name": {"$in": eliminated_names}},
    #             {"$set": {"is_eliminated": True}}
    #         )
            
    #     return advancing_teams

    # @staticmethod
    # async def generate_group_stage_2(advancing_teams: list[str]):
    #     """Puts advancing teams into a Super Group and generates Strict Sequential Rounds."""
    #     await teams_collection.update_many(
    #         {"team_name": {"$in": advancing_teams}},
    #         {"$set": {"current_group": "Super_Group"}}
    #     )

    #     matches = []
    #     member_names = list(advancing_teams)
        
    #     if len(member_names) % 2 != 0:
    #         member_names.append("BYE")
            
    #     num_teams = len(member_names)
        
    #     # Circle Method Scheduling Algorithm for Super Group
    #     for round_num in range(1, num_teams):
    #         for i in range(num_teams // 2):
    #             team_a = member_names[i]
    #             team_b = member_names[num_teams - 1 - i]
                
    #             if team_a != "BYE" and team_b != "BYE":
    #                 matches.extend(GameService._create_2x1v1(
    #                     team_a, team_b, variant="5+3", stage="group_stage_2", 
    #                     group_id="Super_Group", round_number=round_num
    #                 ))
            
    #         member_names.insert(1, member_names.pop())

    #     if matches:
    #         await games_collection.insert_many(matches)
            
    #     return {"status": "success", "matches": len(matches)}

    # @staticmethod
    # async def evaluate_group_stage_2() -> list[str]:
    #     """Calculates the Top 2 overall from the Super Group to advance to Finals."""
    #     from app.services.team_service import TeamService
    #     all_teams = await TeamService.get_leaderboard()
    #     super_group = [t for t in all_teams if not t.get("is_eliminated", False) and t.get("current_group") == "Super_Group"]
        
    #     advancing_teams = []
    #     eliminated_names = []
        
    #     if len(super_group) > 2:
    #         advancing_teams = [m["team_name"] for m in super_group[:2]]
    #         eliminated_names = [m["team_name"] for m in super_group[2:]]
    #     else:
    #         advancing_teams = [m["team_name"] for m in super_group]
            
    #     if eliminated_names:
    #         await teams_collection.update_many(
    #             {"team_name": {"$in": eliminated_names}},
    #             {"$set": {"is_eliminated": True}}
    #         )
            
    #     return advancing_teams

    @staticmethod
    async def generate_finals(advancing_teams: list[str]):
        """Generates 3 sequential rounds of 1v1 split boards (6 games total) for the top 2 teams."""
        if len(advancing_teams) != 2:
            return {"status": "error", "message": "Finals require exactly 2 teams."}
            
        team_a, team_b = advancing_teams[0], advancing_teams[1]
        matches = []
        
        for round_num in range(1, 4):
            matches.extend(GameService._create_2x1v1(
                team_a, team_b, variant="10+3", stage=f"finals_round", group_id="Finals", round_number=round_num
            ))
            
        if matches:
            await games_collection.insert_many(matches)
            
        return {"status": "success", "finals_matches": len(matches)}

    @staticmethod
    def _create_2x1v1(team_a: str, team_b: str, variant: str, stage: str, group_id: str, round_number: int):
        """Helper to generate two separate 1v1 boards for a Team vs Team matchup."""
        return [
            {
                "game_id": f"{stage}_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "stage": stage,
                "group_id": group_id,
                "round_number": round_number,
                "status": "pending",
                "board_number": 1
            },
            {
                "game_id": f"{stage}_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "stage": stage,
                "group_id": group_id,
                "round_number": round_number,
                "status": "pending",
                "board_number": 2
            }
        ]

    @staticmethod
    async def generate_swiss_stage():
        """
        Generates 4 rounds of Swiss pairings for top 14 teams.
        """
        from app.services.team_service import TeamService

        all_teams = await TeamService.get_leaderboard()
        active_teams = [t for t in all_teams if not t.get("is_eliminated", False)]

        # Take top 14 after qualifiers
        swiss_teams = active_teams[:14]
        team_names = [t["team_name"] for t in swiss_teams]

        matches = []
        total_rounds = 4

        # Track opponents (to avoid repeats)
        played_against = {team: set() for team in team_names}

        for round_num in range(1, total_rounds + 1):

            # 🔥 FIX: Use leaderboard instead of _compute_team_stats
            leaderboard = await TeamService.get_leaderboard()

            leaderboard_map = {t["team_name"]: t for t in leaderboard}

            sorted_teams = sorted(
                team_names,
                key=lambda t: (
                    leaderboard_map.get(t, {}).get("points", 0),
                    leaderboard_map.get(t, {}).get("net_time_diff", 0)
                ),
                reverse=True
            )

            used = set()

            for i in range(len(sorted_teams)):
                if sorted_teams[i] in used:
                    continue

                for j in range(i + 1, len(sorted_teams)):
                    if sorted_teams[j] in used:
                        continue

                    t1 = sorted_teams[i]
                    t2 = sorted_teams[j]

                    # Avoid repeat matches
                    if t2 not in played_against[t1]:
                        used.add(t1)
                        used.add(t2)

                        played_against[t1].add(t2)
                        played_against[t2].add(t1)

                        matches.extend(GameService._create_2x1v1(
                            t1, t2,
                            variant="5+0",
                            stage="swiss_stage",
                            group_id="Swiss",
                            round_number=round_num
                        ))
                        break

        if matches:
            await games_collection.insert_many(matches)

        return {
            "status": "success",
            "rounds": total_rounds,
            "matches": len(matches)
        }
    
    @staticmethod
    async def evaluate_swiss_stage() -> list[str]:
        """
        Returns top 6 teams from Swiss stage.
        """
        stats = await GameService._compute_team_stats(stage="swiss_stage")

        ranked = sorted(
            stats.items(),
            key=lambda x: (x[1]["points"], x[1]["tie_break"]),
            reverse=True
        )

        top_6 = [team for team, _ in ranked[:6]]

        # Eliminate rest
        eliminated = [team for team, _ in ranked[6:]]

        if eliminated:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated}},
                {"$set": {"is_eliminated": True}}
            )

        return top_6
    
    @staticmethod
    async def generate_round_robin_top6(teams: list[str]):
        """
        Single Round Robin for Top 6 teams.
        """
        matches = []
        member_names = list(teams)

        if len(member_names) % 2 != 0:
            member_names.append("BYE")

        num_teams = len(member_names)

        for round_num in range(1, num_teams):
            for i in range(num_teams // 2):
                t1 = member_names[i]
                t2 = member_names[num_teams - 1 - i]

                if t1 != "BYE" and t2 != "BYE":
                    matches.extend(GameService._create_2x1v1(
                        t1, t2,
                        variant="5+0",
                        stage="round_robin_top6",
                        group_id="Top6",
                        round_number=round_num
                    ))

            # Rotate
            member_names.insert(1, member_names.pop())

        if matches:
            await games_collection.insert_many(matches)

        return {
            "status": "success",
            "matches": len(matches)
        }

    @staticmethod
    async def evaluate_round_robin_top6() -> list[str]:
        """
        Returns top 2 teams from RR stage.
        """
        stats = await GameService._compute_team_stats(stage="round_robin_top6")

        ranked = sorted(
            stats.items(),
            key=lambda x: (x[1]["points"], x[1]["tie_break"]),
            reverse=True
        )

        top_2 = [team for team, _ in ranked[:2]]
        eliminated = [team for team, _ in ranked[2:]]

        if eliminated:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated}},
                {"$set": {"is_eliminated": True}}
            )

        return top_2
    
    @staticmethod
    async def _compute_team_stats(stage: str):
        """
        Dynamically computes points and tie-break (net time diff).
        """
        cursor = games_collection.find({"stage": stage})
        games = await cursor.to_list(length=1000)

        stats = {}

        for g in games:
            for team in [g["team_a"], g["team_b"]]:
                if team not in stats:
                    stats[team] = {
                        "points": 0,
                        "tie_break": 0
                    }

            # You must ensure these fields exist in DB
            # Example fields: team_a_score, team_b_score, time_diff

            a_score = g.get("team_a_score", 0)
            b_score = g.get("team_b_score", 0)

            stats[g["team_a"]]["points"] += a_score
            stats[g["team_b"]]["points"] += b_score

            stats[g["team_a"]]["tie_break"] += g.get("team_a_time_diff", 0)
            stats[g["team_b"]]["tie_break"] += g.get("team_b_time_diff", 0)

        return stats
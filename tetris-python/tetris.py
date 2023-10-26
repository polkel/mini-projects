import numpy as np
import math
import msvcrt
import time
import random
import os


class Game:
    """Tetris game built with numpy arrays.

    To adjust the difficulty, change the TIME_INTERVAL, DIFFICULTY_FACTOR, or SCORE_DIFFICULTY constants.
    The time it takes for a piece to automatically move down is calculated with the following formula:

    TIME_INTERVAL * (DIFFICULTY_FACTOR ** (floor(current_score / SCORE_DIFFICULTY)))

    Every time the score hits a multiple of the SCORE_DIFFICULTY, the game gets harder based on the DIFFICULTY_FACTOR.

    Notes:
    - Flickering issues on the terminal are mitigated with the use of ANSI escape sequence ESC[F
    - Windows only for now due to msvcrt, but can be converted to use sys.stdin and sys.stdout in future
    """
    TIME_INTERVAL = 0.75
    DIFFICULTY_FACTOR = 0.9
    SCORE_DIFFICULTY = 5
    PIECES = ["O", "I", "Z", "L", "S", "J", "T"]
    WELCOME = "Welcome to Tetris!"
    LEFT_IN = "a"
    RIGHT_IN = "d"
    DOWN_IN = "s"
    ROTATE_IN = "w"
    EXIT_IN = "p"
    CONTROLS = f"Controls:\n\n{LEFT_IN} - left\n{RIGHT_IN} - right\n{DOWN_IN} - down\n{ROTATE_IN} - rotate\n"
    CONTROLS += f"{EXIT_IN} - exit"
    MOVE_DICT = dict()
    MOVE_DICT[LEFT_IN] = "left"
    MOVE_DICT[RIGHT_IN] = "right"
    MOVE_DICT[DOWN_IN] = "down"
    MOVE_DICT[ROTATE_IN] = "rotate"

    def __init__(self):
        self.grid = None
        self.current_piece = None
        self.gaming = None
        self.score = 0
        self.current_time_interval = self.TIME_INTERVAL

    def new_game(self):
        self.grid = Grid()
        self.grid.controls = self.CONTROLS
        os.system("cls")
        print(f"{self.WELCOME}\n\n{self.CONTROLS}\n\n\nPress any key to continue")
        while True:
            if msvcrt.kbhit():
                os.system("cls")
                print(f"{self.CONTROLS}")
                break
        self.game_auto_input()

    def add_piece(self, shape, top_left):
        self.current_piece = Piece(shape, top_left)

    def game_auto_input(self):
        self.gaming = True
        start_time = time.time()
        while self.gaming:
            # If no piece, set a piece and reset timer
            # If there is a piece, wait for input or go down automatically if time exceeds current interval
            end_time = time.time()
            if self.current_piece:
                self.current_piece.last_location = self.current_piece.location.copy()
                if end_time - start_time > self.current_time_interval:
                    valid_move = self.current_piece.move("down", self.grid)
                    if not valid_move:
                        self.validate_down()
                    self.grid.show_grid(self.current_piece)
                    start_time = time.time()
                elif msvcrt.kbhit():
                    player_input = msvcrt.getwch()
                    if player_input in self.MOVE_DICT.keys():
                        direction = self.MOVE_DICT[player_input]
                        valid_move = self.current_piece.move(direction, self.grid)
                        if not valid_move and direction == "down":
                            self.validate_down()
                    elif player_input == self.EXIT_IN:
                        self.grid.show_grid(self.current_piece, no_buffer=True)
                        break
                    self.grid.show_grid(self.current_piece)
            else:
                new_piece = math.floor(random.random() * len(self.PIECES))
                new_piece = self.PIECES[new_piece]
                self.add_piece(new_piece, self.grid.piece_start)
                self.grid.show_grid(self.current_piece)
                start_time = time.time()

    def validate_down(self):  # additional validation when a down move is invalid
        game_over = len(np.where(self.current_piece.location[0] == 0)[0]) > 0
        if game_over:
            self.grid.show_grid(self.current_piece, no_buffer=True)
            print("GAME OVER!")
            self.gaming = False
        self.commit_piece()

    def commit_piece(self):
        self.grid.grid[self.current_piece.location[0], self.current_piece.location[1]] = self.current_piece.shape
        self.current_piece = None
        self.check_break()

    def check_break(self):  # breaks completed rows, updates scores, and updates difficulty
        rows_to_break = []
        for row in range(len(self.grid.grid)):
            if not (self.grid.grid[row, ...] == self.grid.EMPTY_SYMBOL).any():
                rows_to_break.append(row)
        self.grid.grid = np.delete(self.grid.grid, rows_to_break, axis=0)
        self.grid.grid = np.insert(self.grid.grid, 0, np.full((len(rows_to_break), self.grid.width), "-"), axis=0)
        self.score += len(rows_to_break)
        self.grid.score = self.score
        difficulty_multiplier = math.floor(self.score / self.SCORE_DIFFICULTY)
        self.current_time_interval = self.TIME_INTERVAL * (self.DIFFICULTY_FACTOR ** difficulty_multiplier)


class Grid:
    PIECE_SYMBOL = "0"
    EMPTY_SYMBOL = "-"
    color_codes = dict()
    color_codes["Z"] = "30"
    color_codes["S"] = "31"
    color_codes["O"] = "32"
    color_codes["L"] = "33"
    color_codes["I"] = "34"
    color_codes["T"] = "35"
    color_codes["J"] = "36"

    def __init__(self, width=10, height=20):
        self.piece_start = np.array([[0], [math.floor(width/2) - 2]])  # calculates top left coord for piece start
        self.width = width
        self.height = height
        self.grid = np.full((height, width), self.EMPTY_SYMBOL)
        self.last_grid_shown = None
        self.score = 0
        self.controls = ""
        self.spacer = ""  # this will hold the backspaces
        self.buffer = "\033[F" * (3 + self.height)

    def show_grid(self, piece=None, no_buffer=False):
        grid_to_print = self.grid.copy()
        if piece:
            grid_to_print[piece.location[0], piece.location[1]] = piece.shape
        if no_buffer or not np.array_equal(grid_to_print, self.last_grid_shown):
            array_str = np.array2string(grid_to_print)
            grid_str = array_str.replace("[", "").replace("]", "").replace("'", "").replace("\n ", "\n")
            for shape, code in self.color_codes.items():
                grid_str = grid_str.replace(shape, f"\033[{code}m{self.PIECE_SYMBOL}\033[0m")
            # os.system("cls")  # flickers too much
            self.last_grid_shown = grid_to_print.copy()
            to_show = f"{grid_str}\nScore: {self.score}\n"
            if no_buffer:
                print(f"\n{to_show}")
            else:
                print(f"\n{to_show}{self.buffer}")


class Piece:

    """The pieces are defined on a 4 x 4 row, column grid top left being 0, 0.

    The first array has row indices that correspond with the second array of column indices.

    The rotations array stores the positional translations needed from the previous configuration
    to get to the correct orientation.

    The adjustments array has a list of possible adjustments after a rotation if the piece is out of bounds.

    e.g. If a vertical line piece rotates next to a wall, some of the pieces may be positioned beyond the wall.
    Possible adjustments for this is to go left twice or to go right once.

              >   < <
    - 0 - -   0 0 0 0
    - 0 - -   - - - -
    - 0 - -   - - - -
    - 0 - -   - - - -

    Below are the different orientations of each piece within the 4 x 4 grid.

    O:

    - 0 0 -
    - 0 0 -
    - - - -
    - - - -

    I:

    - 0 - -   0 0 0 0
    - 0 - -   - - - -
    - 0 - -   - - - -
    - 0 - -   - - - -

    S:

    - 0 0 -   - 0 - -
    0 0 - -   - 0 0 -
    - - - -   - - 0 -
    - - - -   - - - -

    Z:

    - 0 0 -   - - 0 -
    - - 0 0   - 0 0 -
    - - - -   - 0 - -
    - - - -   - - - -

    L:

    - 0 - -   - - 0 -   - 0 0 -   - 0 0 0
    - 0 - -   0 0 0 -   - - 0 -   - 0 - -
    - 0 0 -   - - - -   - - 0 -   - - - -
    - - - -   - - - -   - - - -   - - - -

    J:

    - - 0 -   0 0 0 -   - 0 0 -   - 0 - -
    - - 0 -   - - 0 -   - 0 - -   - 0 0 0
    - 0 0 -   - - - -   - 0 - -   - - - -
    - - - -   - - - -   - - - -   - - - -

    T:

    - 0 - -   - 0 - -   - - 0 -   - 0 0 0
    - 0 0 -   0 0 0 -   - 0 0 -   - - 0 -
    - 0 - -   - - - -   - - 0 -   - - - -
    - - - -   - - - -   - - - -   - - - -

    """
    pieces = dict()
    rotations_dict = dict()
    adjustments_dict = dict()
    colors_dict = dict()

    pieces["O"] = np.array([[0, 0, 1, 1], [1, 2, 1, 2]])
    rotations_dict["O"] = [np.array([[0, 0, 0, 0], [0, 0, 0, 0]])]
    adjustments_dict["O"] = [[]]
    colors_dict["O"] = "yellow"

    pieces["I"] = np.array([[0, 1, 2, 3], [1, 1, 1, 1]])
    rotations_dict["I"] = [np.array([[0, 1, 2, 3], [1, 0, -1, -2]]),
                           np.array([[0, -1, -2, -3], [-1, 0, 1, 2]])]
    adjustments_dict["I"] = [["up", "up", "up"],
                             ["left", "left", "left", "right"]]
    colors_dict["I"] = "red"

    pieces["S"] = np.array([[0, 0, 1, 1], [1, 2, 0, 1]])
    rotations_dict["S"] = [np.array([[-1, 0, -1, 0], [0, 1, -2, -1]]),
                           np.array([[1, 0, 1, 0], [0, -1, 2, 1]])]
    adjustments_dict["S"] = [["right"],
                             ["up"]]
    colors_dict["S"] = "green"

    pieces["Z"] = np.array([[0, 0, 1, 1], [1, 2, 2, 3]])
    rotations_dict["Z"] = [np.array([[0, -1, 0, -1], [-1, 0, 1, 2]]),
                           np.array([[0, 1, 0, 1], [1, 0, -1, -2]])]
    adjustments_dict["Z"] = [["left"],
                             ["up"]]
    colors_dict["Z"] = "magenta"

    pieces["L"] = np.array([[0, 1, 2, 2], [1, 1, 1, 2]])
    rotations_dict["L"] = [np.array([[0, 1, 2, 1], [-2, -1, 0, 1]]),
                           np.array([[1, 0, -1, -2], [-1, 0, 1, 0]]),
                           np.array([[1, 0, -1, 0], [2, 1, 0, -1]]),
                           np.array([[-2, -1, 0, 1], [1, 0, -1, 0]])]
    adjustments_dict["L"] = [["up"],
                             ["right"],
                             ["up"],
                             ["left"]]
    colors_dict["L"] = "cyan"

    pieces["J"] = np.array([[0, 1, 2, 2], [2, 2, 2, 1]])
    rotations_dict["J"] = [np.array([[-1, 0, 1, 2], [-1, 0, 1, 0]]),
                           np.array([[0, -1, -2, -1], [-2, -1, 0, 1]]),
                           np.array([[2, 1, 0, -1], [1, 0, -1, 0]]),
                           np.array([[-1, 0, 1, 0], [2, 1, 0, -1]])]
    adjustments_dict["J"] = [["up"],
                             ["right"],
                             ["down"],
                             ["left"]]
    colors_dict["J"] = "blue"

    pieces["T"] = np.array([[0, 1, 1, 2], [1, 1, 2, 1]])
    rotations_dict["T"] = [np.array([[0, 1, 0, 2], [-2, -1, 0, 0]]),
                           np.array([[1, 0, -1, -1], [-1, 0, -1, 1]]),
                           np.array([[1, 0, 1, -1], [2, 1, 0, 0]]),
                           np.array([[-2, -1, 0, 0], [1, 0, 1, -1]])]
    adjustments_dict["T"] = [["up"],
                             ["right"],
                             ["up"],
                             ["left"]]
    colors_dict["T"] = "white"

    def __init__(self, shape, top_left_start):
        self.shape = shape
        self.location = self.pieces[shape].copy() + top_left_start  # adjust for the center of the grid
        self.last_location = self.location.copy()  # used to revert location when a move is not legal
        self.rotations = self.rotations_dict[shape]
        self.rotation_state = 0
        self.adjustments = self.adjustments_dict[shape]
        self.color = self.colors_dict[shape]

    def up(self):
        self.location[0, ...] -= 1

    def down(self):
        self.location[0, ...] += 1

    def left(self):
        self.location[1, ...] -= 1

    def right(self):
        self.location[1, ...] += 1

    def rotate(self):
        self.rotation_state = (self.rotation_state + 1) % len(self.rotations)
        self.location = self.location + self.rotations[self.rotation_state]

    def move(self, direction, grid):
        if direction == "up":
            self.up()
        elif direction == "down":
            self.down()
        elif direction == "left":
            self.left()
        elif direction == "right":
            self.right()
        elif direction == "rotate":
            self.rotation_state = (self.rotation_state + 1) % len(self.rotations)
            self.location = self.location + self.rotations[self.rotation_state]
        valid_move = self.validate_piece(grid)
        if not valid_move:
            if direction != "rotate":
                self.revert_location()
            else:
                valid_move = self.adjust_piece(grid)
        return valid_move

    def revert_location(self):
        self.location = self.last_location.copy()

    def validate_piece(self, grid):  # returns true if piece is in a valid position
        height_out_of_bounds = len(np.where(self.location[0] >= grid.height)[0]) > 0
        left_out_of_bounds = len(np.where(self.location[1] < 0)[0]) > 0
        right_out_of_bounds = len(np.where(self.location[1] >= grid.width)[0]) > 0
        if height_out_of_bounds or left_out_of_bounds or right_out_of_bounds:
            return False
        spaces_in_location = grid.grid[self.location[0], self.location[1]]
        collision = len(np.where(spaces_in_location != "-")[0]) > 0
        return not collision

    def adjust_piece(self, grid):  # checks if adjusting after the rotation of a piece is a legal move
        adjustments = self.adjustments[self.rotation_state].copy()
        while len(adjustments) > 0:
            adjustment = adjustments.pop()
            if adjustment == "up":
                self.up()
            elif adjustment == "left":
                self.left()
            elif adjustment == "right":
                self.right()
            elif adjustment == "down":
                self.down()
            if self.validate_piece(grid):
                return True
        self.rotation_state = (self.rotation_state - 1) % len(self.rotations)
        self.revert_location()
        return False


if __name__ == "__main__":
    os.system("")
    game = Game()
    game.new_game()

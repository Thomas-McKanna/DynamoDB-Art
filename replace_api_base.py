import sys

api_base = sys.argv[1]

with open("frontend/scripts.js", "r") as infile:
    lines = infile.readlines()
    lines[0] = f'let API_BASE = "{api_base}";\n'

with open("frontend/scripts.js", "w") as outfile:
    outfile.writelines(lines)

#!/usr/bin/env python3
"""Convert the Garmin Connect strength exercise CSV into src/constants/exercise-catalog.ts.

CSV layout (1206 exercises, 33 categories):
- row 1: section headers
- row 2: column headers
- row 3+: data, one exercise per row

Column meanings (by header name):
- NAME_GARMIN      → exerciseName (passed to Garmin API)
- CATEGORY_GARMIN  → exerciseCategory (passed to Garmin API)
- Name             → friendly English name (e.g. "Barbell Bench Press")
- Body parts       → target muscle groups
- Difficulty       → Beginner | Intermediate | Advanced
- Focus            → e.g. "Strength", "Cardio", "Mobility"
- 17 equipment flag columns (Nothing, Bench, Barbell, Dumbbells, ...): "1" if used

Usage: python3 scripts/build-exercise-catalog.py < INPUT_CSV > src/constants/exercise-catalog.ts
"""
import csv
import json
import sys

EQUIPMENT_COLUMNS = [
    "Nothing", "Bench", "Barbell", "Dumbbells", "Kettlebells", "Sliding Discs",
    "Box", "Dip Device", "Squat Rack", "Jump Rope", "Mat", "Ab Wheel",
    "Weight Plates", "Swiss Ball", "Cable Machine", "Cable Attachment", "Pull-up Bar",
]

EQUIPMENT_KEY_MAP = {
    "Nothing": "bodyweight",
    "Bench": "bench",
    "Barbell": "barbell",
    "Dumbbells": "dumbbells",
    "Kettlebells": "kettlebells",
    "Sliding Discs": "sliding_discs",
    "Box": "box",
    "Dip Device": "dip_device",
    "Squat Rack": "squat_rack",
    "Jump Rope": "jump_rope",
    "Mat": "mat",
    "Ab Wheel": "ab_wheel",
    "Weight Plates": "weight_plates",
    "Swiss Ball": "swiss_ball",
    "Cable Machine": "cable_machine",
    "Cable Attachment": "cable_attachment",
    "Pull-up Bar": "pull_up_bar",
}


def main():
    reader = csv.reader(sys.stdin)
    rows = list(reader)
    header = rows[1]
    col_index = {name: i for i, name in enumerate(header)}

    exercises = []
    categories = {}

    for row in rows[2:]:
        if not row or not row[0].strip():
            continue
        name = row[col_index["NAME_GARMIN"]].strip()
        category = row[col_index["CATEGORY_GARMIN"]].strip()
        if not name or not category:
            continue

        friendly = row[col_index["Name"]].strip()
        body_parts = row[col_index["Body parts"]].strip()
        difficulty = row[col_index["Difficulty"]].strip()
        focus = row[col_index["Focus"]].strip()

        equipment = []
        for col in EQUIPMENT_COLUMNS:
            try:
                if row[col_index[col]].strip() == "1":
                    equipment.append(EQUIPMENT_KEY_MAP[col])
            except (KeyError, IndexError):
                pass

        exercises.append({
            "category": category,
            "name": name,
            "friendly": friendly,
            "bodyParts": body_parts,
            "difficulty": difficulty,
            "focus": focus,
            "equipment": equipment,
        })
        categories.setdefault(category, []).append(name)

    print(f"Parsed {len(exercises)} exercises across {len(categories)} categories", file=sys.stderr)

    lines = [
        "// Generated from the Garmin Connect strength exercise catalog (1206 exercises, 33 categories).",
        "// Source: scraped from https://connect.garmin.com/modern/exercises/{CATEGORY}/{NAME}",
        "// To refresh: pipe the latest CSV through scripts/build-exercise-catalog.py.",
        "// Do not hand-edit.",
        "",
        "export type EquipmentKey =",
    ]
    eq_keys = sorted(set(EQUIPMENT_KEY_MAP.values()))
    for i, k in enumerate(eq_keys):
        suffix = ";" if i == len(eq_keys) - 1 else ""
        lines.append(f"  | '{k}'{suffix}")
    lines.append("")

    lines += [
        "export type ExerciseEntry = {",
        "  category: string;",
        "  name: string;",
        "  friendly: string;",
        "  bodyParts: string;",
        "  difficulty: string;",
        "  focus: string;",
        "  equipment: EquipmentKey[];",
        "};",
        "",
        "export const EXERCISE_CATALOG: readonly ExerciseEntry[] = [",
    ]
    for e in exercises:
        equipment_str = ", ".join(f"'{eq}'" for eq in e["equipment"])
        lines.append(
            "  { "
            f"category: '{e['category']}', "
            f"name: '{e['name']}', "
            f"friendly: {json.dumps(e['friendly'])}, "
            f"bodyParts: {json.dumps(e['bodyParts'])}, "
            f"difficulty: {json.dumps(e['difficulty'])}, "
            f"focus: {json.dumps(e['focus'])}, "
            f"equipment: [{equipment_str}]"
            " },"
        )
    lines.append("];")
    lines.append("")

    lines.append("export const EXERCISE_CATEGORIES: readonly string[] = [")
    for c in sorted(categories):
        lines.append(f"  '{c}',")
    lines.append("];")
    lines.append("")

    lines += [
        "const exercisesByKey = new Map<string, ExerciseEntry>(",
        "  EXERCISE_CATALOG.map((e) => [`${e.category}/${e.name}`, e] as const),",
        ");",
        "",
        "export function findExercise(category: string, name: string): ExerciseEntry | undefined {",
        "  return exercisesByKey.get(`${category}/${name}`);",
        "}",
        "",
        "export function listByCategory(category: string): ExerciseEntry[] {",
        "  return EXERCISE_CATALOG.filter((e) => e.category === category);",
        "}",
        "",
    ]

    sys.stdout.write("\n".join(lines))


if __name__ == "__main__":
    main()

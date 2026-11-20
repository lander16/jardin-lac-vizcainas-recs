"""Generate deterministic synthetic Spanish patron profiles with unique emails and cardnumbers."""

import csv
import hashlib
import random
import sys

try:
    from .config import CHECKOUTS_PATH, PATRON_NAMES_PATH, fold_ascii, write_json_atomic
except ImportError:
    from config import CHECKOUTS_PATH, PATRON_NAMES_PATH, fold_ascii, write_json_atomic

FIRST_NAMES = [
    "Sofía", "Alejandro", "Camila", "Mateo", "Valentina", "Santiago", "Isabella", "Sebastián", "Mariana", "Leonardo",
    "Regina", "Emiliano", "Daniela", "Diego", "Victoria", "Nicolás", "Natalia", "Samuel", "Ximena", "Joaquín",
    "Gabriela", "Daniel", "Fernanda", "Andrés", "Valeria", "Gael", "Luciana", "Rodrigo", "Paulina", "Bastián",
    "Andrea", "Ángel", "Montserrat", "Felipe", "Adriana", "Adrián", "Clara", "Bruno", "Elena", "Carlos",
    "Sara", "David", "Renata", "Emmanuel", "Elisa", "Juan", "Juana", "Miguel", "María", "José",
    "Gabriel", "Guadalupe", "Francisco", "Antonio", "Pedro", "Manuel", "Luis", "Ana", "Carmen", "Rosa",
]

LAST_NAMES = [
    "Hernández", "García", "Martínez", "López", "González", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Cruz",
    "Gómez", "Flores", "Morales", "Vázquez", "Jiménez", "Reyes", "Díaz", "Torres", "Gutiérrez", "Ruiz",
    "Mendoza", "Aguilar", "Ortiz", "Moreno", "Castillo", "Romero", "Álvarez", "Méndez", "Chávez", "Rivera",
    "Juárez", "Ramos", "Domínguez", "Herrera", "Medina", "Castro", "Vargas", "Guzmán", "Velázquez", "Rojas",
    "Salazar", "Ortega", "Guerrero", "Estrada", "Cortés", "Alvarado", "Espinoza", "Lara", "Mejía", "Silva",
]


def get_seeded_random(user_id):
    digest = hashlib.md5(user_id.encode("utf-8")).hexdigest()
    return random.Random(int(digest, 16) % 100_000_000)


def slugify_name_part(value):
    return "".join(ch for ch in fold_ascii(value).lower() if ch.isalnum())


def generate_patron_profiles(user_ids):
    patron_mapping = {}
    used_emails = set()
    used_cards = set()

    for user_id in sorted(user_ids):
        rng = get_seeded_random(user_id)
        first = rng.choice(FIRST_NAMES)
        last1 = rng.choice(LAST_NAMES)
        last2 = rng.choice(LAST_NAMES)
        full_name = f"{first} {last1} {last2}"

        base_first = slugify_name_part(first)
        base_last1 = slugify_name_part(last1)
        base_last2 = slugify_name_part(last2)

        email = f"{base_first}.{base_last1}@vizcainas.edu.mx"
        if email in used_emails:
            email = f"{base_first}.{base_last1}.{base_last2}@vizcainas.edu.mx"
        suffix = 2
        while email in used_emails:
            email = f"{base_first}.{base_last1}.{base_last2}{suffix}@vizcainas.edu.mx"
            suffix += 1
        used_emails.add(email)

        card_num = rng.randint(1_000_000_000, 9_999_999_999)
        while str(card_num) in used_cards:
            card_num = (card_num + 1) % 9_000_000_000 + 1_000_000_000
        card_str = str(card_num)
        used_cards.add(card_str)

        patron_mapping[user_id] = {
            "name": full_name,
            "email": email,
            "cardnumber": card_str,
        }

    return patron_mapping


def main():
    if not CHECKOUTS_PATH.exists():
        print(f"Error: {CHECKOUTS_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    users = set()
    with open(CHECKOUTS_PATH, mode="r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            users.add(row["user_id"])

    patron_mapping = generate_patron_profiles(users)
    write_json_atomic(PATRON_NAMES_PATH, patron_mapping)
    print(f"Generated unique synthetic names for {len(patron_mapping)} users -> {PATRON_NAMES_PATH}")


if __name__ == "__main__":
    main()

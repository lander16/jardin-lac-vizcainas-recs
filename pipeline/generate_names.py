import csv
import json
import os
import hashlib
import random

# Seedable pseudo-random generation based on user_id to keep names stable
def get_seeded_random(user_id):
    # Create an integer seed from the MD5 hash of the user_id
    hash_object = hashlib.md5(user_id.encode('utf-8'))
    seed = int(hash_object.hexdigest(), 16) % 100000000
    r = random.Random(seed)
    return r

FIRST_NAMES = [
    "Sofía", "Alejandro", "Camila", "Mateo", "Valentina", "Santiago", "Isabella", "Sebastián", "Mariana", "Leonardo",
    "Regina", "Emiliano", "Daniela", "Diego", "Victoria", "Nicolás", "Natalia", "Samuel", "Ximena", "Joaquín",
    "Gabriela", "Daniel", "Fernanda", "Andrés", "Valeria", "Gael", "Luciana", "Rodrigo", "Paulina", "Bastián",
    "Andrea", "Ángel", "Montserrat", "Felipe", "Adriana", "Adrián", "Clara", "Bruno", "Elena", "Carlos",
    "Sara", "David", "Renata", "Emmanuel", "Elisa", "Juan", "Juana", "Miguel", "María", "José",
    "Gabriel", "Guadalupe", "Francisco", "Antonio", "Pedro", "Manuel", "Luis", "Ana", "Carmen", "Rosa"
]

LAST_NAMES = [
    "Hernández", "García", "Martínez", "López", "González", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Cruz",
    "Gómez", "Flores", "Morales", "Vázquez", "Jiménez", "Reyes", "Díaz", "Torres", "Gutiérrez", "Ruiz",
    "Mendoza", "Aguilar", "Ortiz", "Moreno", "Castillo", "Romero", "Álvarez", "Méndez", "Chávez", "Rivera",
    "Juárez", "Ramos", "Dominguez", "Herrera", "Medina", "Castro", "Vargas", "Guzmán", "Velázquez", "Rojas",
    "Salazar", "Ortega", "Guerrero", "Estrada", "Cortés", "Alvarado", "Espinoza", "Lara", "Mejía", "Silva"
]

def main():
    csv_file = "synthetic_checkouts.csv"
    output_dir = "data"
    output_file = os.path.join(output_dir, "patron_names.json")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    users = set()
    with open(csv_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.add(row['user_id'])
            
    patron_mapping = {}
    for user_id in sorted(list(users)):
        r = get_seeded_random(user_id)
        first_name = r.choice(FIRST_NAMES)
        last_name_1 = r.choice(LAST_NAMES)
        last_name_2 = r.choice(LAST_NAMES)
        
        full_name = f"{first_name} {last_name_1} {last_name_2}"
        
        # Clean up names for email
        clean_first = first_name.lower().replace("í", "i").replace("á", "a").replace("é", "e").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
        clean_last = last_name_1.lower().replace("í", "i").replace("á", "a").replace("é", "e").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
        
        email = f"{clean_first}.{clean_last}@vizcainas.edu.mx"
        card_number = str(r.randint(1000000000, 9999999999))
        
        patron_mapping[user_id] = {
            "name": full_name,
            "email": email,
            "cardnumber": card_number
        }
        
    with open(output_file, mode='w', encoding='utf-8') as f:
        json.dump(patron_mapping, f, indent=2, ensure_ascii=False)
        
    print(f"Generated names for {len(patron_mapping)} users and wrote to {output_file}")

if __name__ == "__main__":
    main()

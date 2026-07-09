import csv
import random
import datetime

# Seed for reproducibility (optional, but good for benchmarks)
random.seed(42)

# Configuration
NUM_ROWS = 700
FILENAME = "benchmark_700_messy_leads.csv"

# Data banks
FIRST_NAMES = ["Amit", "Neha", "Rahul", "Priya", "John", "Jane", "Ali", "Fatima", "Chen", "Wei", "Sarah", "Raj", "Kavita", "Suresh", "Vikram", "Anita", "Ravi", "Manoj"]
LAST_NAMES = ["Sharma", "Patel", "Reddy", "Iyer", "Smith", "Doe", "Khan", "Wang", "Li", "Gupta", "Singh", "Nair", "Menon", "Joshi", "Bose"]
DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "company.com", "startup.io", "tech.in", "enterprise.co"]
PROJECTS = ["Meridian Tower", "Eden Park", "Varah Swamy Layout", "Sarjapur Plots", "Unknown", "General Enquiry", "Looking for 3BHK"]
STATUSES = ["Hot", "Warm", "Cold", "Not Interested", "Site Visit Done", "Site Visit Scheduled", "Already Bought", "Budget Issue", "Follow Up Later", "DND", "Wrong Number"]
AGENTS = ["Ramesh", "Suresh", "Priya Agent", "Karan", "Unassigned"]
CAMPAIGNS = ["Google_Search_Branded", "FB_LeadGen_Q3", "IG_Retargeting", "LinkedIn_B2B", "Manual_Upload", "Organic_Traffic"]

def random_date(start_year=2024, end_year=2026):
    start = datetime.date(start_year, 1, 1)
    end = datetime.date(end_year, 12, 31)
    return start + datetime.timedelta(days=random.randint(0, (end - start).days))

def format_date(d, style):
    if style == 0: return d.strftime("%Y-%m-%d")
    if style == 1: return d.strftime("%d/%m/%Y")
    if style == 2: return d.strftime("%d-%b-%Y")
    if style == 3: return d.strftime("%B %d, %Y")
    if style == 4: return "Today"
    if style == 5: return "Yesterday"
    if style == 6: return d.strftime("%m/%d/%y %H:%M")
    return d.isoformat()

def generate_messy_phone():
    base = "".join([str(random.randint(0, 9)) for _ in range(10)])
    style = random.randint(0, 7)
    if style == 0: return base
    if style == 1: return f"+91 {base}"
    if style == 2: return f"0{base}"
    if style == 3: return f"+91-{base[:5]}-{base[5:]}"
    if style == 4: return f"{base} ext {random.randint(10, 999)}"
    if style == 5: return f"+91 {base} x{random.randint(1, 99)}"
    if style == 6: return f"({base[:3]}) {base[3:6]}-{base[6:]}"
    if style == 7: return f"91{base}"
    return base

def generate_messy_email(first, last):
    base = f"{first.lower()}.{last.lower()}@{random.choice(DOMAINS)}"
    style = random.randint(0, 5)
    if style == 0: return base
    if style == 1: return f"{base} [donotemail]"
    if style == 2: return f"<{base}>"
    if style == 3: return f"{base.replace('.', '_')}"
    if style == 4: return f"Invalid: {base}"
    if style == 5: return f"{first.lower()}{random.randint(1, 99)}@{random.choice(DOMAINS)}"
    return base

with open(FILENAME, mode='w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    # Define realistic, slightly ambiguous headers
    headers = [
        "Date of Enquiry", 
        "Customer Name", 
        "Primary Email", 
        "Contact Number", 
        "Alt Phone", 
        "Campaign Source", 
        "Project Interest", 
        "Budget", 
        "Sales Rep", 
        "Current Status", 
        "Agent Comments"
    ]
    writer.writerow(headers)

    for i in range(NUM_ROWS):
        # Scenario mapping to ensure a mix of clean and very messy rows
        scenario = random.choices(
            ["clean", "missing_email", "missing_phone", "contact_in_notes", "garbage", "duplicate"], 
            weights=[40, 20, 15, 10, 5, 10], 
            k=1
        )[0]
        
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        
        email = generate_messy_email(first, last)
        phone = generate_messy_phone()
        alt_phone = generate_messy_phone() if random.random() > 0.8 else ""
        
        date_str = format_date(random_date(), random.randint(0, 6))
        campaign = random.choice(CAMPAIGNS)
        project = random.choice(PROJECTS)
        budget = f"{random.randint(50, 250)} Lacs" if random.random() > 0.3 else ""
        rep = random.choice(AGENTS)
        status = random.choice(STATUSES)
        
        notes_base = f"Interested in {project}. " if project != "Unknown" else ""
        notes = f"{notes_base}Follow up requested." if random.random() > 0.5 else "No remarks."
        
        if scenario == "clean":
            # Mostly perfect data
            pass
        elif scenario == "missing_email":
            email = ""
            if random.random() > 0.5: email = "N/A"
        elif scenario == "missing_phone":
            phone = ""
            if random.random() > 0.5: phone = "WhatsApp Only"
        elif scenario == "contact_in_notes":
            notes = f"Customer email is {email} and alternate number {phone}. Says he wants a 3BHK by Diwali."
            email = ""
            phone = "check notes"
        elif scenario == "garbage":
            name = "TEST TEST"
            email = "test@test.com"
            phone = "1234567890"
            notes = "ASDFASDFASDF"
            status = "Junk"
            if random.random() > 0.5:
                # Completely empty row
                name = email = phone = date_str = campaign = project = budget = rep = status = notes = alt_phone = ""
        elif scenario == "duplicate":
            # Generate a row that looks like a duplicate
            notes = "DUPLICATE LEAD. " + notes
            status = "Duplicate"
        
        # Add some random newlines to notes to test CSV escaping
        if random.random() > 0.8 and notes:
            notes += "\nClient is very particular about Vastu.\nNeeds east facing."

        row = [
            date_str,
            name,
            email,
            phone,
            alt_phone,
            campaign,
            project,
            budget,
            rep,
            status,
            notes
        ]
        writer.writerow(row)

print(f"Successfully generated {NUM_ROWS} rows in {FILENAME}")

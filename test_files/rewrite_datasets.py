import os
import csv
import random
import datetime

# --- Expanded Data Pools ---
FIRST_NAMES = [
    # Indian
    'Rahul', 'Priya', 'Aditya', 'Neha', 'Vikram', 'Anjali', 'Arjun', 'Sneha', 'Ravi', 'Kavita', 'Suresh', 'Anita', 'Rajesh', 'Pooja', 'Vivek', 'Riya', 'Karthik', 'Swati',
    # Middle Eastern
    'Mohamed', 'Fatima', 'Omar', 'Aisha', 'Tariq', 'Layla', 'Yousef', 'Nour', 'Khalid', 'Zahra',
    # American/European
    'John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Ashley', 'Robert', 'Amanda', 'Lars', 'Sven', 'Elena', 'Carlos', 'Mateo', 'Lucia', 'William', 'Olivia',
    # East Asian
    'Wei', 'Chen', 'Yuki', 'Hiroshi', 'Min-jun', 'Seo-yeon', 'Takumi', 'Mei',
    # African
    'Kwame', 'Ngozi', 'Tariro', 'Kofi', 'Amina', 'Chidi',
    # LatAm
    'Diego', 'Valentina', 'Santiago', 'Isabella', 'Alejandro', 'Camila'
]

LAST_NAMES = [
    # Indian
    'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Jain', 'Das', 'Bose', 'Nair', 'Pillai', 'Chauhan', 'Yadav',
    # Middle Eastern
    'Ali', 'Hassan', 'Hussein', 'Ibrahim', 'Mahmoud', 'Saleh',
    # American/European
    'Doe', 'Smith', 'Brown', 'Johnson', 'Williams', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Muller', 'Schmidt', 'Silva', 'Santos', 'Taylor', 'Anderson',
    # East Asian
    'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Tanaka', 'Suzuki', 'Takahashi', 'Kim', 'Lee', 'Park',
    # African
    'Mensah', 'Okafor', 'Diallo', 'Traore', 'Ndiaye',
    # LatAm
    'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez'
]

DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com',
    'company.net', 'startup.io', 'enterprise.co', 'techsolutions.in', 'logistics.com', 'corp.org',
    'builders.co.in', 'hospital.org', 'university.edu', 'agency.media', 'consulting.biz', 'yahoo.co.in'
]

COMPANIES = [
    'Acme Corp', 'TechNova', 'Global Logistics', 'Sunrise Foods', 'Apex Solutions', 'Zenith Enterprises', 'BlueOcean', 
    'Quantum Systems', 'Pioneer Manufacturing', 'Stellar Services', 'NextGen IT', 'Urban Builders', 'City Hospital',
    'Metro Properties', 'Agile Agency', 'FinServe Group', 'Healthcare Partners', 'Retail Giants', 'Ecom Express',
    'WebWorks', 'DataFlow', 'Skyline Construction', 'Paramount Health'
]

CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad', 'Kolkata', 'New York', 'London', 'Toronto', 'Sydney', 'Singapore', 'Dubai', 'San Francisco', 'Berlin', 'Tokyo']
ESTATE_PROJECTS = ['Meridian Tower', 'Eden Park', 'Sarjapur Plots', 'Varah Swamy', 'Palm Springs', 'Orchid Gardens', 'Lakeview Villas', 'Sunset Heights']

NOTES_POOL = [
    "Asked to call after 6 PM", "Decision maker travelling", "Interested in 3BHK", "Loan discussion pending", 
    "Already spoke to spouse", "Budget revised", "Duplicate enquiry", "Previous enquiry closed", 
    "Requested brochure", "Sent pricing over WhatsApp", "Referred by existing customer", "Needs GST invoice", 
    "Requested virtual demo", "Follow up next Tuesday", "Prefers email communication", "Works night shift", 
    "Number belongs to receptionist", "Not picking up", "Wrong number", "VM left", "FUP", "CBL", 
    "Hot lead", "Warm", "Cold", "Not interested", "Do Not Call", "DNC", "Sale closed", "Awaiting confirmation",
    "PIC unavailable", "Called 3 times, no response", "Email bounced", "Send catalog again", 
    "Wants credit period of 60 days", "Price sensitive", "Very strict on quality", "Will visit with spouse"
]

def generate_date(messy=False):
    d = datetime.datetime(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 1000), hours=random.randint(0, 23))
    if messy:
        fmt = random.choice([
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%b %d, %Y", "%Y.%m.%d", 
            "Yesterday", "Today", "InvalidDate", ""
        ])
        if fmt in ["Yesterday", "Today", "InvalidDate", ""]: return fmt
        return d.strftime(fmt)
    return d.strftime("%Y-%m-%d %H:%M:%S")

def generate_phone(messy=False, intl=False):
    if intl:
        fmt = random.choice(['+44 7{} {}', '+1 ({}) {}-{}', '+61 4{} {}', '0091-{}'])
        if '+44' in fmt: return fmt.format(random.randint(100,999), random.randint(100000,999999))
        if '+1' in fmt: return fmt.format(random.randint(200,999), random.randint(200,999), random.randint(1000,9999))
        if '+61' in fmt: return fmt.format(random.randint(10,99), random.randint(100000,999999))
        if '0091' in fmt: return fmt.format(random.randint(9000000000,9999999999))
    if messy:
        fmt = random.choice(['91-9{}-{}', '+91 9{} {}', '09{} {}', '9{} {}', '9{}{}', '+91 (9{}) {}-{}'])
        if '{}' in fmt:
            n = str(random.randint(10000000, 99999999))
            res = fmt
            for i in range(fmt.count('{}')):
                chunk_len = len(n) // max(1, fmt.count('{}'))
                chunk = n[:chunk_len] if i < fmt.count('{}') - 1 else n
                n = n[chunk_len:]
                res = res.replace('{}', chunk, 1)
            
            # Additional messiness
            if random.random() < 0.1:
                res += f" ext {random.randint(10, 999)}"
            return res
        return '9' + str(random.randint(100000000, 999999999))
    
    # Standard format
    return '+919' + ''.join([str(random.randint(0,9)) for _ in range(9)])

def generate_email(fn, ln, domain, messy=False):
    base = f"{fn.lower()}.{ln.lower()}@{domain}"
    if messy:
        if random.random() < 0.1:
            return base.upper()
        if random.random() < 0.1:
            return f" {base} "
        if random.random() < 0.1:
            return f"{base}, secondary@{random.choice(DOMAINS)}"
        if random.random() < 0.1:
            return base.replace('@', 'at') # Typo
    return base

# Processor functions for each persona

def process_facebook():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    email = generate_email(fn, ln, random.choice(DOMAINS), messy=True) if random.random() < 0.9 else ''
    phone = generate_phone(messy=True) if random.random() < 0.9 else ''
    
    return {
        'id': f"l_{random.randint(100000000000000, 999999999999999)}",
        'created_time': generate_date(),
        'campaign_name': random.choice(['Q3_Retargeting', 'Lookalike_Audience_1', 'Brand_Awareness_IN', 'Lead_Gen_Form']),
        'adset_name': random.choice(['Broad_25-45', 'Tech_Interests', 'Custom_List_Upload']),
        'form_id': f"{random.randint(10000000000, 99999999999)}",
        'platform': random.choice(['fb', 'ig']),
        'full_name': f"{fn} {ln}",
        'email': email,
        'phone_number': phone,
        'lead_quality': random.choice(['HIGH', 'LOW', '']) if random.random() < 0.5 else ''
    }

def process_google():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    has_phone = random.choice([True, False, True, True])
    has_email = random.choice([True, False, True, True])
    if not has_phone and not has_email: has_email = True

    return {
        'Campaign': random.choice(['Search_Branded', 'Search_Generic', 'Display_Remarketing']),
        'Ad Group': random.choice(['Competitor_Keywords', 'Exact_Match', 'B2B_Terms']),
        'Keyword': random.choice(['"crm software"', '[best lead gen tool]', '+sales +platform']),
        'Match Type': random.choice(['Exact', 'Phrase', 'Broad']),
        'Network': random.choice(['Search Network', 'Display Network']),
        'Conversion Time': generate_date(),
        'Lead Name': f"{fn} {ln}",
        'Business Email': generate_email(fn, ln, random.choice(DOMAINS)) if has_email else '',
        'Reach Number': generate_phone(messy=True) if has_phone else '',
        'Landing Page': random.choice(['/pricing', '/demo', '/features', '/']),
        'Device': random.choice(['Mobile', 'Desktop', 'Tablet']),
        'Browser': random.choice(['Chrome', 'Safari', 'Firefox', 'Edge'])
    }

def process_real_estate():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    project = random.choice(ESTATE_PROJECTS)
    
    return {
        'Enquiry Date': generate_date(messy=True),
        'Customer Details': f"{fn} {ln}",
        'Primary Mobile': generate_phone(),
        'Email ID': generate_email(fn, ln, random.choice(DOMAINS)),
        'Project Name': project,
        'Preferred Configuration': random.choice(['1 BHK', '2 BHK', '3 BHK', 'Villa', 'Plot']),
        'Budget': random.choice(['50-80L', '80L-1Cr', '1Cr+', '2Cr+']),
        'Possession': random.choice(['Ready to Move', 'Under Construction', '1 Year', '2 Years']),
        'Source': random.choice(['Direct', 'Broker', 'MagicBricks', '99acres', 'Facebook']),
        'Broker': random.choice(['', 'PropConsult', 'RealtyExperts']) if random.random() < 0.3 else '',
        'Site Visit': random.choice(['Yes', 'No', 'Scheduled']),
        'Sales Executive': random.choice(['Amit', 'Priya', 'Ravi', 'Sneha']),
        'Status': random.choice(['Interested', 'Call back next week', 'Site visit completed', 'Loan discussion pending', 'Not interested', 'Budget issue']),
        'Builder Remarks': random.choice(NOTES_POOL)
    }

def process_sales_excel():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    company = random.choice(COMPANIES)
    name_fmt = random.choice([f"{fn} {ln}", f"{ln}, {fn}", f"{fn.lower()} {ln.upper()}", fn])
    
    return {
        'Date Added': generate_date(messy=True),
        'Contact Person': name_fmt,
        'Client Company': company,
        'Best Number': generate_phone(messy=True),
        'Email Address': generate_email(fn, ln, random.choice(DOMAINS), messy=True),
        'City & State': f"{random.choice(CITIES)}, {random.choice(['MH', 'KA', 'DL', 'TS', 'TN', 'UP', 'NY', 'CA'])}",
        'Current CRM': random.choice(['Salesforce', 'Hubspot', 'Zoho', 'Excel', 'None', '?']),
        'Internal Remarks': random.choice(NOTES_POOL),
        'Follow-up': random.choice(['Yes', 'No', 'Pending', '']),
        'Status': random.choice(['Hot', 'Cold', 'Warm', 'Closed', 'VM left', 'CBL']),
        'Empty Column': ''
    }

def process_agency():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    return {
        'Date': generate_date(messy=True),
        'Client': random.choice(['SaaS Startup', 'E-commerce Brand', 'Local Clinic']),
        'Source': random.choice(['Meta Ads', 'Google Ads', 'LinkedIn', 'Organic', 'Referral']),
        'Campaign': random.choice(['Q1_Promo', 'Retargeting_30d', 'Lookalike_1%']),
        'UTM Source': random.choice(['facebook', 'google', 'linkedin', 'direct']),
        'UTM Medium': random.choice(['cpc', 'social', 'email']),
        'UTM Campaign': 'Q1_Promo',
        'Prospect': f"{fn} {ln}",
        'Preferred Contact': generate_email(fn, ln, random.choice(DOMAINS)),
        'Phone': generate_phone(),
        'Organization': random.choice(COMPANIES),
        'Lead Score': random.randint(10, 100),
        'Cost per Lead': f"${random.uniform(5, 50):.2f}",
        'Agent Comments': random.choice(['MQL', 'SQL', 'Disqualified', 'Spam', ''])
    }

def process_hospital():
    fn = random.choice(FIRST_NAMES)
    return {
        'Enquiry Date': generate_date(messy=True),
        'Patient Name': f"{fn} {random.choice(LAST_NAMES)}",
        'Guardian Name': random.choice(['', f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"]),
        'Age/Gender': f"{random.randint(5, 80)}/{random.choice(['M', 'F', 'O'])}",
        'Department': random.choice(['Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'General Medicine']),
        'Preferred Doctor': random.choice(['Dr. Sharma', 'Dr. Patel', 'Dr. Reddy', 'Any']),
        'Appointment Date': generate_date(messy=True),
        'Patient Email': generate_email(fn, 'patel', random.choice(DOMAINS)) if random.random() < 0.5 else '',
        'Contact Number': generate_phone(messy=True),
        'Insurance Provider': random.choice(['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'None', '']),
        'Customer Feedback': random.choice(NOTES_POOL)
    }

def process_university():
    fn = random.choice(FIRST_NAMES)
    return {
        'Date': generate_date(),
        'Student Name': f"{fn} {random.choice(LAST_NAMES)}",
        'Parent/Guardian Name': random.choice([f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}", '']),
        'Course Interested': random.choice(['B.Tech CS', 'B.Tech Mech', 'BBA', 'MBA', 'BCA']),
        'Current Board': random.choice(['CBSE', 'ICSE', 'State Board']),
        '12th Percentage / Expected': f"{random.randint(60, 99)}%",
        'Student Email': generate_email(fn, 'student', 'gmail.com'),
        'Parent Phone': generate_phone(),
        'Student Phone': generate_phone() if random.random() < 0.7 else '',
        'City': random.choice(CITIES),
        'Assigned Counsellor': random.choice(['Priya', 'Ravi', 'Sneha', 'Amit']),
        'Application Stage': random.choice(['Enquiry', 'Form Submitted', 'Fee Paid', 'Dropped']),
        'Counsellor Remarks': random.choice(NOTES_POOL)
    }

def process_international():
    fn = random.choice(['Jean', 'Carlos', 'Elena', 'Yuki', 'Lars', 'Fatima', 'Olivia', 'Noah', 'Wei', 'Kwame'])
    ln = random.choice(['Dupont', 'Garcia', 'Martinez', 'Tanaka', 'Muller', 'Ali', 'Smith', 'Tremblay', 'Wang', 'Mensah'])
    return {
        'Record ID': f"INTL-{random.randint(1000,9999)}",
        'Full Name': f"{fn} {ln}",
        'Corporate Email': generate_email(fn, ln, random.choice(DOMAINS)),
        'Office Contact': generate_phone(intl=True),
        'Country': random.choice(['France', 'Spain', 'Mexico', 'Japan', 'Germany', 'UAE', 'UK', 'Canada', 'Australia', 'Ghana', 'China']),
        'Region/State': random.choice(['Ile-de-France', 'Catalonia', 'Tokyo', 'Bavaria', 'Dubai', 'Ontario']),
        'City': random.choice(['Paris', 'Barcelona', 'Tokyo', 'Munich', 'Dubai', 'Toronto', 'Sydney']),
        'Timezone': random.choice(['CET', 'EST', 'PST', 'JST', 'GST']),
        'Language Preference': random.choice(['English', 'French', 'Spanish', 'Japanese', 'German', 'Arabic']),
        'Enterprise': random.choice(COMPANIES),
        'Job Title': random.choice(['Director', 'Manager', 'CEO', 'Consultant', 'Engineer']),
        'Latest Update': random.choice(['Requires translation services', 'Call during their afternoon', 'Met at Global Expo', ''])
    }

def process_manufacturing():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    return {
        'Customer Organization': random.choice(['Apex Manufacturing', 'SteelWorks Ltd', 'Global Auto Parts', 'Precision Tools', 'Heavy Machinery Inc']),
        'Contact Person': f"{fn} {ln}",
        'Designation': random.choice(['Purchase Manager', 'Procurement Head', 'Plant Head', 'Director', 'Engineer']),
        'Department': random.choice(['Procurement', 'Operations', 'Engineering', 'Management']),
        'Email': generate_email(fn, ln, random.choice(DOMAINS)),
        'Direct Line': generate_phone(),
        'Factory Location': f"{random.choice(CITIES)} Industrial Area",
        'Requirement': random.choice(['Raw materials', 'CNC Machines', 'Maintenance Services', 'Spare Parts']),
        'Budget (Annual)': random.choice(['< 10L', '10-50L', '50L - 1Cr', '> 1Cr']),
        'Current Vendor': random.choice(['Vendor A', 'Local Supplier', 'Importing', 'None']),
        'Meeting Status': random.choice(['Scheduled', 'Completed', 'Awaiting Quote', 'Lost to Competitor']),
        'Sales Notes': random.choice(NOTES_POOL)
    }

def process_startup():
    fn = random.choice(FIRST_NAMES)
    return {
        'Lead ID': random.randint(100, 999),
        'Name': fn,
        'Role': random.choice(['Founder', 'Co-founder', 'Growth Hacker', 'Product Manager', 'Dev']),
        'Startup Name': random.choice(['SaaSify', 'AI.io', 'FintechRevolution', 'HealthTech Pro', 'EdTech Hub']),
        'Funding Stage': random.choice(['Bootstrapped', 'Seed', 'Series A', 'Series B']),
        'Work Email': generate_email(fn, random.choice(LAST_NAMES), 'startup.io'),
        'Mobile': generate_phone(),
        'LinkedIn': f"linkedin.com/in/{fn.lower()}-{random.randint(1,99)}",
        'Use Case': random.choice(['Internal tools', 'Customer facing app', 'Data analysis', 'Automation']),
        'Vibe': random.choice(['Super hot', 'Cold', 'Ghosted', 'Needs nurturing']),
        'Discussion Summary': random.choice(NOTES_POOL)
    }

def process_nightmare():
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    
    row = {
        ' Lead Name ': f"{fn} {ln}",
        'Reach Number': generate_phone(messy=True),
        'Email Address': generate_email(fn, ln, random.choice(DOMAINS)),
        'Organization': random.choice(COMPANIES),
        'Date': generate_date(messy=True),
        'Status': random.choice(['New', 'In Progress', 'Done', '']),
        'Internal Remarks': random.choice([
            'Regular note', 'Note with, comma', 'Note with\nnewline', '{"json": "snippet", "key": "value"}', 
            '<p>HTML snippet</p>', 'Multiple sentences. Here is another one! Call back.', 
            'Unicode test: 😊 ✓ 🚀', ''
        ]),
        'Empty1': '',
        ' Gar bage ': random.choice(['garb', '#$@%', '123', '=SUM(A1:A5)', ''])
    }
    
    # Introduce intentional nightmares randomly
    if random.random() < 0.1:
        row[' Lead Name '] = row[' Lead Name '] + ' 🚀'
    if random.random() < 0.2:
        row['Reach Number'] = row['Reach Number'] + ' or ' + generate_phone()
    if random.random() < 0.2:
        row['Email Address'] = row['Email Address'] + ', ' + generate_email(fn, ln, random.choice(DOMAINS))
    if random.random() < 0.1:
        # Swap phone and email
        row['Reach Number'], row['Email Address'] = row['Email Address'], row['Reach Number']
    if random.random() < 0.2:
        row['Organization'] = "   " + row['Organization'] + "\t"
    if random.random() < 0.1:
        row['Date'] = "44927" # Excel serial date
    
    return row

MAPPINGS = {
    'facebook_lead_ads_export.csv': (process_facebook, 100),
    'google_ads_lead_export.csv': (process_google, 100),
    'real_estate_crm_export.csv': (process_real_estate, 400),
    'sales_team_excel.csv': (process_sales_excel, 150),
    'marketing_agency_lead_sheet.csv': (process_agency, 120),
    'hospital_inquiry_leads.csv': (process_hospital, 80),
    'university_admission_enquiries.csv': (process_university, 150),
    'international_dataset.csv': (process_international, 300),
    'manufacturing_company_contacts.csv': (process_manufacturing, 80),
    'startup_internal_spreadsheet.csv': (process_startup, 60),
    'absolute_nightmare_dataset.csv': (process_nightmare, 350)
}

def main():
    test_dir = '.'
    for filename, (processor, target_size) in MAPPINGS.items():
        filepath = os.path.join(test_dir, filename)
        
        # Add random variance to target size (+/- 20%)
        actual_size = int(target_size * random.uniform(0.8, 1.2))
        
        print(f"Generating {filename} with {actual_size} rows...")
        
        new_rows = []
        for _ in range(actual_size):
            row = processor()
            
            # 5% chance to duplicate the previous row with slight modifications
            if new_rows and random.random() < 0.05:
                dup_row = new_rows[-1].copy()
                # Slight modification to duplicate (e.g. updated notes, or different status)
                if 'Internal Remarks' in dup_row:
                    dup_row['Internal Remarks'] = "DUPLICATE: " + str(dup_row['Internal Remarks'])
                if 'Status' in dup_row:
                    dup_row['Status'] = 'Updated'
                new_rows.append(dup_row)
            else:
                new_rows.append(row)
            
        if new_rows:
            headers = list(new_rows[0].keys())
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                # Use strict quoting for the nightmare dataset to handle newlines and commas correctly
                quoting = csv.QUOTE_MINIMAL
                if filename == 'absolute_nightmare_dataset.csv':
                    quoting = csv.QUOTE_ALL
                    
                writer = csv.DictWriter(f, fieldnames=headers, quoting=quoting)
                writer.writeheader()
                writer.writerows(new_rows)
                
    print("Done rewriting all datasets with extreme realism!")

if __name__ == '__main__':
    main()

import os
import csv
import random
import datetime

# --- Realistic Data Pools ---
FIRST_NAMES = ['Rahul', 'Priya', 'Aditya', 'Neha', 'John', 'Sarah', 'Wei', 'Chen', 'Mohamed', 'Fatima', 'Vikram', 'Anjali', 'Arjun', 'Sneha', 'Ravi', 'Diana', 'Charlie', 'Alice', 'Raj', 'Amit', 'Sunil', 'Kavita', 'Suresh', 'Anita']
LAST_NAMES = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Doe', 'Smith', 'Wang', 'Li', 'Hassan', 'Ali', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Jain', 'Das', 'Bose', 'Brown', 'Johnson']
DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.net', 'startup.io', 'enterprise.co', 'techsolutions.in', 'logistics.com', 'corp.org']
COMPANIES = ['Acme Corp', 'TechNova', 'Global Logistics', 'Sunrise Foods', 'Apex Solutions', 'Zenith Enterprises', 'BlueOcean', 'Quantum Systems', 'Pioneer Manufacturing', 'Stellar Services']
INDIAN_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad', 'Kolkata']
GLOBAL_CITIES = ['New York', 'London', 'Toronto', 'Sydney', 'Singapore', 'Dubai']
ESTATE_PROJECTS = ['Meridian Tower', 'Eden Park', 'Sarjapur Plots', 'Varah Swamy', 'Palm Springs', 'Orchid Gardens']

def generate_phone(messy=False, intl=False):
    if intl:
        fmt = random.choice(['+44 7{} {}', '+1 ({}) {}-{}', '+61 4{} {}'])
        if '+44' in fmt: return fmt.format(random.randint(100,999), random.randint(100000,999999))
        if '+1' in fmt: return fmt.format(random.randint(200,999), random.randint(200,999), random.randint(1000,9999))
        if '+61' in fmt: return fmt.format(random.randint(10,99), random.randint(100000,999999))
    if messy:
        fmt = random.choice(['91-9{}-{}', '+91 9{} {}', '09{} {}', '9{} {}', '9{}{}', '+91 (9{}) {}-{}'])
        if '{}' in fmt:
            n = str(random.randint(10000000, 99999999))
            res = fmt
            for i in range(fmt.count('{}')):
                chunk_len = len(n) // fmt.count('{}')
                chunk = n[:chunk_len] if i < fmt.count('{}') - 1 else n
                n = n[chunk_len:]
                res = res.replace('{}', chunk, 1)
            return res
        return '9' + str(random.randint(100000000, 999999999))
    return '9' + ''.join([str(random.randint(0,9)) for _ in range(9)])

def generate_email(fn, ln, domain, messy=False):
    base = f"{fn.lower()}.{ln.lower()}@{domain}"
    if messy and random.random() < 0.2:
        return f"{base} and alternate@{random.choice(DOMAINS)}"
    return base

# Processor functions for each persona

def process_facebook(row_index, old_row):
    # Campaign Name, Ad Set, Form Name, Created Time, Platform-generated IDs, Lead Quality, Referral Source
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    email = generate_email(fn, ln, random.choice(DOMAINS), messy=True) if old_row.get('Email') or random.random() < 0.8 else ''
    phone = generate_phone(messy=True) if old_row.get('Phone') or random.random() < 0.8 else ''
    
    # Intentionally messy strings
    if random.random() < 0.1: phone = phone + " ext " + str(random.randint(10, 999))
    if random.random() < 0.1: email = " " + email + " "

    return {
        'id': f"l_{random.randint(100000000000000, 999999999999999)}",
        'created_time': (datetime.datetime(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 365), hours=random.randint(0,23))).strftime("%Y-%m-%dT%H:%M:%S%z"),
        'campaign_name': random.choice(['Q3_Retargeting', 'Lookalike_Audience_1', 'Brand_Awareness_IN', 'Lead_Gen_Form']),
        'adset_name': random.choice(['Broad_25-45', 'Tech_Interests', 'Custom_List_Upload']),
        'form_id': f"{random.randint(10000000000, 99999999999)}",
        'platform': random.choice(['fb', 'ig']),
        'first_name': fn,
        'last_name': ln,
        'email': email,
        'phone_number': phone,
        'lead_quality': random.choice(['HIGH', 'LOW', '']) if random.random() < 0.5 else ''
    }

def process_google(row_index, old_row):
    # Campaign, Ad Group, Keyword, Match Type, Network, Conversion Time, Lead Quality, Landing Page, Device, Browser
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
        'Conversion Time': (datetime.datetime(2023, 6, 1) + datetime.timedelta(days=random.randint(0, 180))).strftime("%m/%d/%Y %H:%M:%S"),
        'Name': f"{fn} {ln}",
        'Email': generate_email(fn, ln, random.choice(DOMAINS)) if has_email else '',
        'Phone': generate_phone(messy=True) if has_phone else '',
        'Landing Page': random.choice(['/pricing', '/demo', '/features', '/']),
        'Device': random.choice(['Mobile', 'Desktop', 'Tablet']),
        'Browser': random.choice(['Chrome', 'Safari', 'Firefox', 'Edge'])
    }

def process_real_estate(row_index, old_row):
    # Budget, BHK Preference, Possession, Broker, Site Visit, Sales Executive, Follow-up, Customer Remarks
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    project = random.choice(ESTATE_PROJECTS)
    
    return {
        'Date': (datetime.datetime(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 365))).strftime("%d-%b-%Y"),
        'Customer Name': f"{fn} {ln}",
        'Contact Number': generate_phone(),
        'Email ID': generate_email(fn, ln, random.choice(DOMAINS)),
        'Project Name': project,
        'BHK': random.choice(['1 BHK', '2 BHK', '3 BHK', 'Villa', 'Plot']),
        'Budget': random.choice(['50-80L', '80L-1Cr', '1Cr+', '2Cr+']),
        'Possession': random.choice(['Ready to Move', 'Under Construction', '1 Year', '2 Years']),
        'Source': random.choice(['Direct', 'Broker', 'MagicBricks', '99acres', 'Facebook']),
        'Broker Name': random.choice(['', 'PropConsult', 'RealtyExperts']) if random.random() < 0.3 else '',
        'Site Visit': random.choice(['Yes', 'No', 'Scheduled']),
        'Sales Executive': random.choice(['Amit', 'Priya', 'Ravi', 'Sneha']),
        'Status': random.choice(['Interested', 'Call back next week', 'Site visit completed', 'Loan discussion pending', 'Not interested', 'Budget issue']),
        'Remarks': random.choice(['Client wants corner flat', 'Negotiating on price', 'Will visit with spouse', 'Needs home loan assistance', '', '', ''])
    }

def process_sales_excel(row_index, old_row):
    # Messy manual excel
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    company = random.choice(COMPANIES)
    
    # Intentionally messy row
    name_fmt = random.choice([f"{fn} {ln}", f"{ln}, {fn}", f"{fn.lower()} {ln.upper()}", fn])
    
    return {
        'Date Added': random.choice(['12/1/2023', '01-Jan-24', '2023.05.14', 'yesterday', '']),
        'Contact Person': name_fmt,
        'Company/Business': company,
        'Phone No': generate_phone(messy=True),
        'Email Address': generate_email(fn, ln, random.choice(DOMAINS), messy=True),
        'City & State': f"{random.choice(INDIAN_CITIES)}, {random.choice(['MH', 'KA', 'DL', 'TS', 'TN', 'UP'])}",
        'Current CRM': random.choice(['Salesforce', 'Hubspot', 'Zoho', 'Excel', 'None', '?']),
        'Last Contacted': random.choice(['Call dropped', 'Busy', 'Spoke to assistant', 'Meeting fixed for Monday', '']),
        'Notes': random.choice([
            'Very interested but budget is tight',
            'Try again next quarter',
            'Email bounced',
            'Called from different number: ' + generate_phone(),
            'Owner name is actually ' + random.choice(FIRST_NAMES),
            '', '', ''
        ])
    }

def process_agency(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    return {
        'Date': (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 60))).strftime("%Y-%m-%d"),
        'Client': random.choice(['SaaS Startup', 'E-commerce Brand', 'Local Clinic']),
        'Source': random.choice(['Meta Ads', 'Google Ads', 'LinkedIn', 'Organic', 'Referral']),
        'Campaign Name': random.choice(['Q1_Promo', 'Retargeting_30d', 'Lookalike_1%']),
        'UTM Source': random.choice(['facebook', 'google', 'linkedin', 'direct']),
        'UTM Medium': random.choice(['cpc', 'social', 'email']),
        'UTM Campaign': 'Q1_Promo',
        'Lead Name': f"{fn} {ln}",
        'Email': generate_email(fn, ln, random.choice(DOMAINS)),
        'Phone': generate_phone(),
        'Company': random.choice(COMPANIES),
        'Lead Score': random.randint(10, 100),
        'CPL': f"${random.uniform(5, 50):.2f}",
        'Comments': random.choice(['MQL', 'SQL', 'Disqualified', 'Spam', ''])
    }

def process_hospital(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    return {
        'Enquiry Date': (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 30))).strftime("%d/%m/%Y"),
        'Patient Name': f"{fn} {random.choice(LAST_NAMES)}",
        'Guardian Name': random.choice(['', f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"]),
        'Age/Gender': f"{random.randint(5, 80)}/{random.choice(['M', 'F', 'O'])}",
        'Department': random.choice(['Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'General Medicine']),
        'Preferred Doctor': random.choice(['Dr. Sharma', 'Dr. Patel', 'Dr. Reddy', 'Any']),
        'Appointment Date': random.choice(['Tomorrow', 'Next Week', 'Urgent', '']),
        'Patient Email': generate_email(fn, 'patel', random.choice(DOMAINS)) if random.random() < 0.5 else '',
        'Contact Number': generate_phone(messy=True),
        'Insurance Provider': random.choice(['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'None', '']),
        'Remarks': random.choice(['Requires wheelchair', 'Second opinion', 'Follow up after tests', ''])
    }

def process_university(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    return {
        'Date': (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 100))).strftime("%d-%b-%Y"),
        'Student Name': f"{fn} {random.choice(LAST_NAMES)}",
        'Parent/Guardian Name': random.choice([f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}", '']),
        'Course Interested': random.choice(['B.Tech CS', 'B.Tech Mech', 'BBA', 'MBA', 'BCA']),
        'Current Board': random.choice(['CBSE', 'ICSE', 'State Board']),
        '12th Percentage / Expected': f"{random.randint(60, 99)}%",
        'Student Email': generate_email(fn, 'student', 'gmail.com'),
        'Parent Phone': generate_phone(),
        'Student Phone': generate_phone() if random.random() < 0.7 else '',
        'City': random.choice(INDIAN_CITIES),
        'Assigned Counsellor': random.choice(['Priya', 'Ravi', 'Sneha', 'Amit']),
        'Application Stage': random.choice(['Enquiry', 'Form Submitted', 'Fee Paid', 'Dropped']),
        'Counsellor Remarks': random.choice(['Wants hostel facility', 'Asking for scholarship', 'Will visit campus next week', 'Not answering calls', ''])
    }

def process_international(row_index, old_row):
    fn = random.choice(['Jean', 'Carlos', 'Elena', 'Yuki', 'Lars', 'Fatima', 'Olivia', 'Noah'])
    ln = random.choice(['Dupont', 'Garcia', 'Martinez', 'Tanaka', 'Muller', 'Ali', 'Smith', 'Tremblay'])
    return {
        'Record ID': f"INTL-{random.randint(1000,9999)}",
        'Full Name': f"{fn} {ln}",
        'Email Address': generate_email(fn, ln, random.choice(DOMAINS)),
        'Phone (International)': generate_phone(intl=True),
        'Country': random.choice(['France', 'Spain', 'Mexico', 'Japan', 'Germany', 'UAE', 'UK', 'Canada', 'Australia']),
        'Region/State': random.choice(['Ile-de-France', 'Catalonia', 'Tokyo', 'Bavaria', 'Dubai', 'Ontario']),
        'City': random.choice(['Paris', 'Barcelona', 'Tokyo', 'Munich', 'Dubai', 'Toronto']),
        'Timezone': random.choice(['CET', 'EST', 'PST', 'JST', 'GST']),
        'Language Preference': random.choice(['English', 'French', 'Spanish', 'Japanese', 'German', 'Arabic']),
        'Company': random.choice(COMPANIES),
        'Job Title': random.choice(['Director', 'Manager', 'CEO', 'Consultant', 'Engineer']),
        'Notes': random.choice(['Requires translation services', 'Call during their afternoon', 'Met at Global Expo 2023', ''])
    }

def process_manufacturing(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    return {
        'Company Name': random.choice(['Apex Manufacturing', 'SteelWorks Ltd', 'Global Auto Parts', 'Precision Tools', 'Heavy Machinery Inc']),
        'Contact Person': f"{fn} {ln}",
        'Designation': random.choice(['Purchase Manager', 'Procurement Head', 'Plant Head', 'Director', 'Engineer']),
        'Department': random.choice(['Procurement', 'Operations', 'Engineering', 'Management']),
        'Email': generate_email(fn, ln, random.choice(DOMAINS)),
        'Direct Line': generate_phone(),
        'Factory Location': f"{random.choice(INDIAN_CITIES)} Industrial Area",
        'Requirement': random.choice(['Raw materials', 'CNC Machines', 'Maintenance Services', 'Spare Parts']),
        'Budget (Annual)': random.choice(['< 10L', '10-50L', '50L - 1Cr', '> 1Cr']),
        'Current Vendor': random.choice(['Vendor A', 'Local Supplier', 'Importing', 'None']),
        'Meeting Status': random.choice(['Scheduled', 'Completed', 'Awaiting Quote', 'Lost to Competitor']),
        'Sales Remarks': random.choice(['Very strict on quality', 'Price sensitive', 'Wants credit period of 60 days', 'Send catalog again', ''])
    }

def process_startup(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    return {
        'Lead ID': random.randint(100, 999),
        'Name': fn,
        'Role': random.choice(['Founder', 'Co-founder', 'Growth Hacker', 'Product Manager', 'Dev']),
        'Startup Name': random.choice(['SaaSify', 'AI.io', 'FintechRevolution', 'HealthTech Pro', 'EdTech Hub']),
        'Funding Stage': random.choice(['Bootstrapped', 'Seed', 'Series A', 'Series B']),
        'Email': generate_email(fn, random.choice(LAST_NAMES), 'startup.io'),
        'Mobile': generate_phone(),
        'LinkedIn': f"linkedin.com/in/{fn.lower()}-{random.randint(1,99)}",
        'Use Case': random.choice(['Internal tools', 'Customer facing app', 'Data analysis', 'Automation']),
        'Vibe': random.choice(['Super hot', 'Cold', 'Ghosted', 'Needs nurturing']),
        'Next Steps': random.choice(['Send calendly link', 'Follow up on discord', 'They want a custom demo', 'Too early for us', ''])
    }

def process_nightmare(row_index, old_row):
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    
    row = {
        'Name': f"{fn} {ln}",
        'Phone': generate_phone(messy=True),
        'Email': generate_email(fn, ln, random.choice(DOMAINS)),
        'Company': random.choice(COMPANIES),
        'Date': random.choice(['2023-01-01', '1/1/2023', 'Jan 1 2023', '44927', '']),
        'Status': random.choice(['New', 'In Progress', 'Done', '']),
        'Notes': random.choice(['Regular note', 'Note with, comma', 'Note with\nnewline', '{"json": "snippet"}', '<p>HTML snippet</p>', '']),
        'Empty1': '',
        'Empty2': '',
        'Garbage': random.choice(['garb', '#$@%', '123', ''])
    }
    
    # Introduce intentional nightmares randomly
    if random.random() < 0.1:
        row['Name'] = row['Name'] + ' 🚀'
    if random.random() < 0.1:
        row['Phone'] = row['Phone'] + ' or ' + generate_phone()
    if random.random() < 0.1:
        row['Email'] = row['Email'] + ', ' + generate_email(fn, ln, random.choice(DOMAINS))
    if random.random() < 0.1:
        # Swap phone and email
        row['Phone'], row['Email'] = row['Email'], row['Phone']
    if random.random() < 0.1:
        row['Company'] = "   " + row['Company'] + "\t"
    
    return row


MAPPINGS = {
    'facebook_lead_ads_export.csv': process_facebook,
    'google_ads_lead_export.csv': process_google,
    'real_estate_crm_export.csv': process_real_estate,
    'sales_team_excel.csv': process_sales_excel,
    'marketing_agency_lead_sheet.csv': process_agency,
    'hospital_inquiry_leads.csv': process_hospital,
    'university_admission_enquiries.csv': process_university,
    'international_dataset.csv': process_international,
    'manufacturing_company_contacts.csv': process_manufacturing,
    'startup_internal_spreadsheet.csv': process_startup,
    'absolute_nightmare_dataset.csv': process_nightmare
}

def main():
    test_dir = '.'
    for filename, processor in MAPPINGS.items():
        filepath = os.path.join(test_dir, filename)
        if not os.path.exists(filepath):
            print(f"Skipping {filename}, not found.")
            continue
            
        print(f"Processing {filename}...")
        
        # Read old rows to preserve count and some structural hints
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            old_rows = list(reader)
            
        if not old_rows:
            # If empty, generate 50 rows
            old_rows = [{} for _ in range(50)]
            
        new_rows = []
        for i, old_row in enumerate(old_rows):
            new_rows.append(processor(i, old_row))
            
        if new_rows:
            headers = list(new_rows[0].keys())
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                writer.writerows(new_rows)
                
    print("Done rewriting all datasets!")

if __name__ == '__main__':
    main()

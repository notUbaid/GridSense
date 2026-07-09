import os
import csv
import random
import datetime

FIRST_NAMES = ['Rahul', 'Priya', 'Aditya', 'Neha', 'Vikram', 'Anjali', 'Arjun', 'Sneha', 'Ravi', 'Kavita', 'John', 'Sarah', 'Michael', 'Emily', 'Wei', 'Chen', 'Diego', 'Valentina']
LAST_NAMES = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Ali', 'Hassan', 'Doe', 'Smith', 'Wang', 'Li', 'Martinez', 'Hernandez']
DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'company.net', 'startup.io', 'enterprise.co', 'techsolutions.in', 'logistics.com']
COMPANIES = ['Acme Corp', 'TechNova', 'Global Logistics', 'Sunrise Foods', 'Apex Solutions', 'Zenith Enterprises', 'BlueOcean', 'Quantum Systems', 'Pioneer Manufacturing', 'Stellar Services', 'NextGen IT', 'Urban Builders', 'City Hospital', 'Metro Properties', 'Agile Agency', 'FinServe Group']
CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad', 'New York', 'London', 'Dubai', 'Tokyo']

LEAD_OWNERS = ['Rahul Mehta', 'Priya Shah', 'Amit Patel', 'Sarah Khan', 'Karan Singh', 'Jessica Wong', 'Ali Hassan']
CRM_STATUSES = ['Interested', 'Hot', 'Warm', 'Cold', 'Call Back', 'Busy', 'No Response', 'Wrong Number', 'Converted', 'Sale Closed', 'Site Visit Completed', 'Meeting Scheduled', 'Budget Issue', 'Loan Pending', 'Follow-up Required', 'Duplicate', 'Invalid Lead', 'Booked', 'Cancelled', 'Lost']
CRM_NOTES = ['Asked to call after 7 PM', 'Interested in 3BHK', 'Decision maker travelling', 'Sent brochure', 'Budget increased', 'Needs GST invoice', 'Already spoke with spouse', 'Follow up next Friday', 'Requested WhatsApp instead of calls', 'Duplicate enquiry from Facebook', 'Old customer returning', 'Preferred morning calls', 'Working night shift', 'Left voicemail', 'Referred by existing client', 'Wants to negotiate', 'Price sensitive', 'Call back tomorrow', 'Not picking up', 'DND']
SOURCES = ['Facebook Lead Ads', 'Instagram', 'Google Search', 'Google Ads', 'Organic', 'Referral', 'Website', 'Walk-In', 'JustDial', 'MagicBricks', '99acres', 'Housing', 'LinkedIn', 'WhatsApp', 'Cold Call', 'Email Campaign', 'Trade Show', 'Broker', 'Employee Referral', 'Partner', 'leads_on_demand', 'Leads_on_demand', 'leads on demand', 'Leads On Demand', '  leads_on_demand ']
DESCRIPTIONS = ['Looking for premium apartment under 1.2 Cr', 'Needs orthopedic consultation', 'Searching for MBA admission', 'Interested in enterprise software demo', 'Requested product catalogue', 'Requires virtual consultation', 'Prefers east-facing unit', 'Need possession before Diwali']

def random_messiness():
    r = random.random()
    if r < 0.60: return 'clean'
    elif r < 0.85: return 'mild'
    elif r < 0.95: return 'incomplete'
    else: return 'difficult'

def get_messy_date(m):
    if m == 'incomplete' and random.random() < 0.5: return ''
    d = datetime.datetime(2025, 1, 1) + datetime.timedelta(days=random.randint(0, 500), hours=random.randint(0, 23))
    if m == 'clean': return d.strftime("%Y-%m-%d %H:%M:%S")
    formats = ["%Y-%m-%d", "%d-%b-%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y.%m.%d", "Yesterday", "Today", "Last Week", "2026.05.14"]
    if m == 'difficult': formats.extend(["44927", "invalid date", "---"])
    fmt = random.choice(formats)
    if fmt in ["Yesterday", "Today", "Last Week", "44927", "invalid date", "---", "2026.05.14"]: return fmt
    return d.strftime(fmt)

def get_messy_phone(m):
    if m == 'incomplete' and random.random() < 0.5: return ''
    if m == 'clean': return '+91 ' + str(random.randint(9000000000, 9999999999))
    variations = ['+91 {}', '{} {}', '+1 ({}) 555-{}', '0091-{}', '+91-{}-{} ext {}', 'Office Number', 'WhatsApp Only', 'Secondary Contact']
    if m == 'difficult': variations.extend(['{} / {}', '+91{}\n{}'])
    fmt = random.choice(variations)
    n = str(random.randint(9000000000, 9999999999))
    if '{}' not in fmt: return fmt
    if fmt == '+91 {}': return fmt.format(n)
    if fmt == '{} {}': return fmt.format(n[:5], n[5:])
    if fmt == '+1 ({}) 555-{}': return fmt.format(random.randint(200,999), random.randint(1000,9999))
    if fmt == '0091-{}': return fmt.format(n)
    if fmt == '+91-{}-{} ext {}': return fmt.format(n[:5], n[5:], random.randint(10,999))
    if fmt == '{} / {}': return fmt.format(n, str(random.randint(9000000000, 9999999999)))
    if fmt == '+91{}\n{}': return fmt.format(n, str(random.randint(9000000000, 9999999999)))
    return n

def get_messy_email(fn, ln, m):
    if m == 'incomplete' and random.random() < 0.5: return ''
    base = f"{fn.lower()}.{ln.lower()}@{random.choice(DOMAINS)}"
    if m == 'clean': return base
    if m == 'mild': return random.choice([base.upper(), f" {base} ", base])
    if m in ['incomplete', 'difficult']:
        return random.choice([
            f"{base}, secondary@{random.choice(DOMAINS)}", 
            base.replace('@', 'at'), f"   {base}   ",
            base + random.choice([' (old)', ' [donotemail]']),
            base if random.random() < 0.5 else ''
        ])
    return base

def introduce_typo(text):
    if not text or not isinstance(text, str) or len(text) < 5: return text
    if random.random() < 0.1:
        idx = random.randint(0, len(text)-1)
        return text[:idx] + text[idx].lower() + text[idx+1:]
    return text

def add_nightmare_elements(row, m):
    if m != 'difficult': return row
    # Apply nightmare stuff
    keys = list(row.keys())
    if random.random() < 0.3:
        k = random.choice(keys)
        row[k] = str(row[k]) + ' 🚀\nNew Line'
    if random.random() < 0.3:
        k = random.choice(keys)
        row[k] = '{"json": "fragment", "data": "' + str(row[k]) + '"}'
    if random.random() < 0.2:
        k = random.choice(keys)
        row[k] = '=SUM(A1:A5)'
    if random.random() < 0.2:
        k = random.choice(keys)
        row[k] = str(row[k]) + ' "quoted, text"'
    return row

def generate_common(m):
    fn, ln = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
    return {
        'fn': fn, 'ln': ln,
        'date': get_messy_date(m),
        'phone': get_messy_phone(m),
        'email': get_messy_email(fn, ln, m),
        'owner': random.choice(LEAD_OWNERS) if m != 'incomplete' else '',
        'status': random.choice(CRM_STATUSES) if m != 'incomplete' else '',
        'note': introduce_typo(random.choice(CRM_NOTES)) if m != 'incomplete' else '',
        'source': random.choice(SOURCES) if m != 'incomplete' else '',
        'desc': random.choice(DESCRIPTIONS) if m != 'incomplete' else ''
    }

def process_facebook():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Platform': random.choice(['fb', 'ig']),
        'Lead Quality': random.choice(['HIGH', 'LOW', '']),
        'Campaign': random.choice(['Q3_Retargeting', 'Lookalike_Audience_1', 'Lead_Gen_Form']),
        'Ad Set': random.choice(['Broad_25-45', 'Tech_Interests', 'Custom_List_Upload']),
        'Creative': 'Video_Ad_v2',
        'Form ID': str(random.randint(1000000, 9999999)),
        'Submitted At': c['date'],
        'Full Name': f"{c['fn']} {c['ln']}",
        'Email Address': c['email'],
        'Phone Number': c['phone'],
        'Agent': c['owner'],
        'Lead State': c['status'],
        'Remarks': c['note']
    }
    return add_nightmare_elements(row, m)

def process_google():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Source': 'Google Ads',
        'Medium': 'cpc',
        'Campaign': 'Search_Branded',
        'Cost Per Lead': f"${random.uniform(5, 50):.2f}",
        'Ad Spend': f"${random.uniform(500, 5000):.2f}",
        'CTR': f"{random.uniform(1, 10):.1f}%",
        'Conversion Time': c['date'],
        'First Name': c['fn'],
        'Last Name': c['ln'],
        'Business Email': c['email'],
        'Reach Number': c['phone'],
        'Sales Rep': c['owner'],
        'Disposition': c['status'],
        'Sales Notes': c['note'],
        'Requirement': c['desc']
    }
    return add_nightmare_elements(row, m)

def process_real_estate():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Enquiry Date': c['date'],
        'Customer Details': f"{c['fn']} {c['ln']}",
        'Primary Mobile': c['phone'],
        'Email ID': c['email'],
        'Project': random.choice([
            'meridian_tower', 'Meridian Tower', 'meridian tower',
            'eden_park', 'Eden Park', 'eden-park',
            'varah_swamy', 'Varah Swamy', 'varahswamy',
            'sarjapur_plots', 'Sarjapur Plots', ' sarjapur_plots '
        ]),
        'Configuration': random.choice(['1 BHK', '2 BHK', '3 BHK', 'Villa']),
        'Budget': random.choice(['50-80L', '80L-1Cr', '1Cr+', '2Cr+']),
        'Possession': random.choice(['Ready to Move', 'Under Construction', '1 Year']),
        'Broker': random.choice(['', 'PropConsult', 'RealtyExperts']),
        'Loan Status': random.choice(['Pending', 'Approved', 'Not Required']),
        'Site Visit': random.choice(['Yes', 'No', 'Scheduled']),
        'Where did they find us': c['source'],
        'Relationship Manager': c['owner'],
        'Stage': c['status'],
        'Discussion Summary': c['note']
    }
    return add_nightmare_elements(row, m)

def process_hospital():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Enquiry Date': c['date'],
        'Patient Name': f"{c['fn']} {c['ln']}",
        'Guardian': random.choice(['', f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"]),
        'Department': random.choice(['Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology']),
        'Doctor': random.choice(['Dr. Sharma', 'Dr. Patel', 'Dr. Reddy', 'Any']),
        'Insurance': random.choice(['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'None', '']),
        'Appointment': get_messy_date(m),
        'Medical Concern': c['desc'],
        'Contact Number': c['phone'],
        'Patient Email': c['email'],
        'Channel': c['source'],
        'Handled By': c['owner'],
        'Current Status': c['status'],
        'Internal Notes': c['note']
    }
    return add_nightmare_elements(row, m)

def process_university():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Date': c['date'],
        'Student Name': f"{c['fn']} {c['ln']}",
        'Course': random.choice(['B.Tech CS', 'BBA', 'MBA', 'BCA']),
        'Program': 'Full Time',
        'Intake': 'Fall 2026',
        'Previous Qualification': 'High School',
        'Scholarship': random.choice(['Requested', 'Not Eligible', 'Approved']),
        'Student Phone': c['phone'],
        'Student Email': c['email'],
        'Acquisition': c['source'],
        'Counsellor': c['owner'],
        'Status': c['status'],
        'Agent Feedback': c['note'],
        'Admission Requirement': c['desc']
    }
    return add_nightmare_elements(row, m)

def process_sales_excel():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Date Added': c['date'],
        'Contact Person': f"{c['fn']} {c['ln']}",
        'Client Company': random.choice(COMPANIES),
        'Industry': random.choice(['IT', 'Manufacturing', 'Retail', 'Healthcare']),
        'Deal Stage': random.choice(['Prospecting', 'Qualified', 'Proposal', 'Negotiation']),
        'Expected Value': f"${random.randint(10, 100)}k",
        'Next Follow-up': get_messy_date(m),
        'Best Number': c['phone'],
        'Email Address': c['email'],
        'Lead Origin': c['source'],
        'Account Manager': c['owner'],
        'Sales Stage': c['status'],
        'Comments': c['note']
    }
    return add_nightmare_elements(row, m)

def process_agency():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Date': c['date'],
        'Prospect': f"{c['fn']} {c['ln']}",
        'Organization': random.choice(COMPANIES),
        'UTM Source': 'google',
        'UTM Medium': 'cpc',
        'UTM Campaign': 'Q1_Promo',
        'Phone': c['phone'],
        'Preferred Contact': c['email'],
        'Platform': c['source'],
        'Executive': c['owner'],
        'Status': c['status'],
        'Latest Update': c['note'],
        'Campaign Summary': c['desc']
    }
    return add_nightmare_elements(row, m)

def process_international():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Record ID': f"INTL-{random.randint(1000,9999)}",
        'Full Name': f"{c['fn']} {c['ln']}",
        'Corporate Email': c['email'],
        'Office Contact': c['phone'],
        'Country': random.choice(['France', 'Spain', 'Mexico', 'Japan', 'Germany', 'UAE']),
        'Timezone': random.choice(['CET', 'EST', 'PST', 'JST']),
        'Language Preference': random.choice(['English', 'French', 'Spanish', 'Japanese']),
        'Enterprise': random.choice(COMPANIES),
        'Job Title': random.choice(['Director', 'Manager', 'CEO', 'Consultant']),
        'Advisor': c['owner'],
        'Status': c['status'],
        'Conversation Summary': c['note']
    }
    return add_nightmare_elements(row, m)

def process_manufacturing():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Customer Organization': random.choice(COMPANIES),
        'Contact Person': f"{c['fn']} {c['ln']}",
        'Designation': random.choice(['Purchase Manager', 'Procurement Head', 'Plant Head']),
        'Email': c['email'],
        'Direct Line': c['phone'],
        'Requirement': c['desc'],
        'Budget (Annual)': random.choice(['< 10L', '10-50L', '50L - 1Cr']),
        'Source': c['source'],
        'Owner': c['owner'],
        'Disposition': c['status'],
        'Remarks': c['note']
    }
    return add_nightmare_elements(row, m)

def process_startup():
    m = random_messiness()
    c = generate_common(m)
    row = {
        'Lead ID': random.randint(100, 999),
        'Name': c['fn'],
        'Role': random.choice(['Founder', 'Co-founder', 'Growth Hacker', 'Product Manager']),
        'Startup Name': random.choice(['SaaSify', 'AI.io', 'FintechRevolution']),
        'Funding Stage': random.choice(['Bootstrapped', 'Seed', 'Series A']),
        'Work Email': c['email'],
        'Mobile': c['phone'],
        'Use Case': c['desc'],
        'Channel': c['source'],
        'Assigned To': c['owner'],
        'Lead State': c['status'],
        'Internal Notes': c['note']
    }
    return add_nightmare_elements(row, m)

def process_nightmare():
    m = 'difficult'
    c = generate_common(m)
    row = {
        ' Lead Name ': f"{c['fn']} {c['ln']}",
        'Reach Number': c['phone'],
        'Email Address': c['email'],
        'Organization': random.choice(COMPANIES),
        'Date': c['date'],
        'Disposition': c['status'],
        'Internal Remarks': c['note'],
        'Empty1': '',
        ' Gar bage ': random.choice(['garb', '#$@%', '123', '=SUM(A1:A5)', ''])
    }
    return add_nightmare_elements(row, m)

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
        actual_size = int(target_size * random.uniform(0.8, 1.2))
        print(f"Generating {filename} with {actual_size} rows...")
        
        new_rows = []
        for _ in range(actual_size):
            row = processor()
            if new_rows and random.random() < 0.05:
                dup_row = new_rows[-1].copy()
                keys = list(dup_row.keys())
                k = random.choice(keys)
                dup_row[k] = "DUPLICATE: " + str(dup_row[k])
                new_rows.append(dup_row)
            else:
                new_rows.append(row)
            
        if new_rows:
            # Reconstruct dict ensuring string keys
            cleaned_rows = []
            for r in new_rows:
                cleaned_rows.append({str(k): v for k, v in r.items()})

            headers = list(cleaned_rows[0].keys())
            
            # Intentionally duplicate a header for nightmare
            if filename == 'absolute_nightmare_dataset.csv':
                # Add duplicate column
                headers.append('Dup Column')
                for r in cleaned_rows:
                    r['Dup Column'] = r.get(' Lead Name ', '')
                    
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                quoting = csv.QUOTE_MINIMAL
                if filename == 'absolute_nightmare_dataset.csv':
                    quoting = csv.QUOTE_ALL
                    
                writer = csv.DictWriter(f, fieldnames=headers, quoting=quoting)
                writer.writeheader()
                writer.writerows(cleaned_rows)
                
    print("Done rewriting all datasets with extreme realism!")

if __name__ == '__main__':
    main()

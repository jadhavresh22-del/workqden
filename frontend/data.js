// frontend/data.js
// Complete, Comprehensive Official List of ALL 28 Indian States & 8 Union Territories
// and Every District in India, plus all 14 Categories with full Subcategories.

const statesDistricts = {
  "Andhra Pradesh": [
    "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", "Chittoor",
    "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur", "Kakinada", "Krishna",
    "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Srikakulam",
    "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Tirupati", "Visakhapatnam", "Vizianagaram",
    "West Godavari", "YSR Kadapa"
  ],
  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi",
    "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang",
    "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang",
    "Tirap", "Upper Dibang Valley", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],
  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang",
    "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj",
    "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar",
    "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong",
    "Bajali", "Tamulpur"
  ],
  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar",
    "Darbhanga", "East Champaran (Motihari)", "Gaya", "Gopalganj", "Jamui", "Jehanabad",
    "Kaimur (Bhabua)", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura",
    "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas",
    "Saharsa", "Samastipur", "Saran (Chapra)", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan",
    "Supaul", "Vaishali", "West Champaran (Bettiah)"
  ],
  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur",
    "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa",
    "Jashpur", "Kabirdham (Kawardha)", "Kanker", "Khairagarh-Chhuikhadan-Gandai", "Kondagaon",
    "Korba", "Koriya", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur",
    "Mohla-Manpur-Ambagarh Chowki", "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sarangarh-Bilaigarh", "Sakti", "Sukma", "Surajpur", "Surguja"
  ],
  "Goa": [
    "North Goa", "South Goa"
  ],
  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad",
    "Chhota Udaipur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar", "Gir Somnath",
    "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada",
    "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],
  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar",
    "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal",
    "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"
  ],
  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],
  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum (Jamshedpur)", "Garhwa",
    "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar",
    "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan",
    "Simdega", "West Singhbhum"
  ],
  "Karnataka": [
    "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
    "Chamarajanagara", "Chikkaballapura", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada (Mangaluru)", "Davanagere", "Dharwad (Hubballi)", "Gadag", "Hassan",
    "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur",
    "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada (Karwar)",
    "Vijayanagara", "Vijayapura", "Yadgir"
  ],
  "Kerala": [
    "Alappuzha", "Ernakulam (Kochi)", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam",
    "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur",
    "Wayanad"
  ],
  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul",
    "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas",
    "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad (Narmadapuram)", "Indore",
    "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mandla", "Mandsaur",
    "Mauganj", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Pandhurna", "Panna", "Raisen",
    "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur",
    "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
  ],
  "Maharashtra": [
    "Ahmednagar (Ahilyanagar)", "Akola", "Amravati", "Chhatrapati Sambhajinagar (Aurangabad)",
    "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Dharashiv (Osmanabad)", "Palghar", "Parbhani", "Pune",
    "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
    "Washim", "Yavatmal"
  ],
  "Manipur": [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam",
    "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong",
    "Tengnoupal", "Thoubal", "Ukhrul"
  ],
  "Meghalaya": [
    "Eastern West Khasi Hills", "East Garo Hills", "East Jaintia Hills",
    "East Khasi Hills (Shillong)", "North Garo Hills", "Ri Bhoi", "South Garo Hills",
    "South West Garo Hills", "South West Khasi Hills", "West Garo Hills (Tura)",
    "West Jaintia Hills", "West Khasi Hills"
  ],
  "Mizoram": [
    "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei",
    "Mamit", "Saiha", "Saitual", "Serchhip"
  ],
  "Nagaland": [
    "Chumoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon",
    "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha",
    "Zunheboto"
  ],
  "Odisha": [
    "Angul", "Balangir", "Balasore (Baleswar)", "Bargarh", "Bhadrak", "Boudh", "Cuttack",
    "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda",
    "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar (Keonjhar)", "Khordha (Bhubaneswar)",
    "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri",
    "Rayagada", "Sambalpur", "Subarnapur (Sonepur)", "Sundargarh"
  ],
  "Punjab": [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur",
    "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa",
    "Moga", "Mohali (SAS Nagar)", "Muktsar", "Pathankot", "Patiala", "Rupnagar (Ropar)",
    "Sangrur", "SBS Nagar (Nawanshahr)", "Tarn Taran"
  ],
  "Rajasthan": [
    "Ajmer", "Alwar", "Anupgarh", "Balotra", "Banswara", "Baran", "Barmer", "Beawar",
    "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Deeg",
    "Didwana-Kuchaman", "Dholpur", "Dudu", "Dungarpur", "Gangapur City", "Hanumangarh",
    "Jaipur", "Jaipur Rural", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur",
    "Jodhpur Rural", "Karauli", "Kekri", "Khairthal-Tijara", "Kota", "Kotputli-Behror",
    "Nagaur", "Neem Ka Thana", "Pali", "Phalodi", "Pratapgarh", "Rajsamand", "Salumbar",
    "Sanchore", "Sawai Madhopur", "Shahpura", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk",
    "Udaipur"
  ],
  "Sikkim": [
    "Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"
  ],
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul",
    "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari (Nagercoil)", "Karur", "Krishnagiri",
    "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris (Ooty)", "Perambalur",
    "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur",
    "Theni", "Thoothukudi (Tuticorin)", "Tiruchirappalli", "Tirunelveli", "Tirupathur",
    "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram",
    "Virudhunagar"
  ],
  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", "Jangaon",
    "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam",
    "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak",
    "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
  ],
  "Tripura": [
    "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti",
    "West Tripura (Agartala)"
  ],
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya (Faizabad)",
    "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly",
    "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria",
    "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar (Noida)",
    "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras",
    "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj",
    "Kaushambi", "Kheri (Lakhimpur)", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj",
    "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar",
    "Pilibhit", "Pratapgarh", "Prayagraj (Allahabad)", "Raebareli", "Rampur", "Saharanpur",
    "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar",
    "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
  ],
  "Uttarakhand": [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital",
    "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar",
    "Uttarkashi"
  ],
  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling",
    "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda",
    "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"
  ],
  "Andaman and Nicobar Islands": [
    "Nicobar", "North and Middle Andaman", "South Andaman"
  ],
  "Chandigarh": [
    "Chandigarh"
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Dadra and Nagar Haveli", "Daman", "Diu"
  ],
  "Delhi": [
    "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
    "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi",
    "West Delhi"
  ],
  "Jammu and Kashmir": [
    "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua",
    "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi",
    "Samba", "Shopian", "Srinagar", "Udhampur"
  ],
  "Ladakh": [
    "Kargil", "Leh"
  ],
  "Lakshadweep": [
    "Lakshadweep"
  ],
  "Puducherry": [
    "Karaikal", "Mahe", "Puducherry", "Yanam"
  ]
};

const categories = {
  "Hospitality & Hotels": [
    "Waiter",
    "Chef",
    "Cook",
    "Kitchen Helper",
    "Housekeeping",
    "Receptionist",
    "Steward",
    "Bartender",
    "Barista",
    "Bellboy / Concierge",
    "Sommelier",
    "Event Host / Hostess"
  ],
  "Events": [
    "Event Helper",
    "Catering Staff",
    "Event Coordinator",
    "Decoration Worker",
    "Photographer",
    "Videographer",
    "Sound Technician",
    "Stage Setup Crew",
    "DJ / Audio Operator"
  ],
  "Home Services": [
    "Plumber",
    "Electrician",
    "Carpenter",
    "Painter",
    "Cleaner",
    "AC Technician",
    "Appliance Repair",
    "Pest Control Worker"
  ],
  "Construction": [
    "Mason",
    "Welder",
    "Carpenter",
    "Painter",
    "Electrician",
    "Plumber",
    "Tile & Marble Layer",
    "Site Supervisor",
    "Helper / Laborer"
  ],
  "Transportation": [
    "Driver",
    "Delivery Partner",
    "Loader",
    "Travel Assistant",
    "Transport Helper",
    "Valet Parking Staff"
  ],
  "Beauty & Personal Care": [
    "Hair Stylist",
    "Makeup Artist",
    "Beautician",
    "Mehendi Artist",
    "Nail Artist",
    "Massage Therapist"
  ],
  "Education": [
    "Tutor",
    "Teaching Assistant",
    "Subject Expert",
    "Academic Support",
    "Language Trainer"
  ],
  "Office & Business": [
    "Data Entry Operator",
    "Receptionist",
    "Office Assistant",
    "Sales Executive",
    "Customer Support",
    "Accountant / Bookkeeper"
  ],
  "Healthcare": [
    "Caretaker",
    "Nursing Assistant",
    "Home Care Worker",
    "Medical Support",
    "Pharmacy Assistant"
  ],
  "Technology": [
    "Web Developer",
    "Graphic Designer",
    "Video Editor",
    "IT Support",
    "Social Media Manager",
    "Mobile App Developer"
  ],
  "Retail": [
    "Store Assistant",
    "Cashier",
    "Sales Staff",
    "Stock Assistant",
    "Visual Merchandiser"
  ],
  "Cleaning & Maintenance": [
    "House Cleaner",
    "Office Cleaner",
    "Gardener",
    "Maintenance Worker",
    "Deep Cleaning Specialist"
  ],
  "Security": [
    "Security Guard",
    "Event Security",
    "Night Guard",
    "Bouncer",
    "CCTV Operator"
  ],
  "Agriculture": [
    "Farm Worker",
    "Gardener",
    "Harvest Worker",
    "Livestock Assistant",
    "Dairy Farm Worker"
  ]
};

const organizationTypes = [
  "5-Star Luxury Hotel",
  "4-Star Hotel",
  "Boutique Hotel",
  "Luxury Resort",
  "Fine Dining Restaurant",
  "Casual Dining & Cafe",
  "Banquet & Event Hall",
  "Bar & Lounge",
  "Catering Service",
  "Corporate Office",
  "Retail Store / Mall",
  "Healthcare Facility",
  "Event Management Agency"
];

const categoryIcons = {
  "Hospitality & Hotels": "🍽️",
  "Events": "🎪",
  "Home Services": "🛠️",
  "Construction": "🏗️",
  "Transportation": "🚚",
  "Beauty & Personal Care": "💇",
  "Education": "📚",
  "Office & Business": "💼",
  "Healthcare": "🏥",
  "Technology": "💻",
  "Retail": "🛍️",
  "Cleaning & Maintenance": "🧹",
  "Security": "🛡️",
  "Agriculture": "🌾"
};

const categoriesList = Object.keys(categories).map(name => ({
  name: name,
  icon: categoryIcons[name] || "📌",
  subcategories: categories[name] || []
}));

const WORQDEN_DATA = {
  states: Object.keys(statesDistricts),
  districts: statesDistricts,
  categories: categoriesList,
  categoriesMap: categories,
  organizationTypes: organizationTypes
};

// Expose globally to window for browser scripts
if (typeof window !== "undefined") {
  window.statesDistricts = statesDistricts;
  window.categories = categories;
  window.organizationTypes = organizationTypes;
  window.WORQDEN_DATA = WORQDEN_DATA;
}

// Helper to populate select elements dynamically
function populateSelect(selectElem, items, defaultText = "Select") {
  if (!selectElem) return;
  selectElem.innerHTML = `<option value="">${defaultText}</option>`;
  
  if (Array.isArray(items)) {
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = typeof item === "object" && item.name ? item.name : item;
      opt.textContent = typeof item === "object" && item.name ? `${item.icon || '📌'} ${item.name}` : item;
      selectElem.appendChild(opt);
    });
  } else if (typeof items === "object" && items !== null) {
    Object.keys(items).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = key;
      selectElem.appendChild(opt);
    });
  }
}

// Universal image fallback & sanitization helpers for WorqDen
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJs(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function getHotelFallbackImage(name) {
  const initial = ((name || "H").trim().charAt(0) || "H").toUpperCase();
  const safeInitial = initial.replace(/[<>&"]/g, "");
  const cleanName = (name || "Partner Hotel").replace(/[<>&"]/g, "").trim().substring(0, 26);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
    <defs>
      <linearGradient id="hBg_${safeInitial}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="hAcc_${safeInitial}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F97316"/>
        <stop offset="100%" stop-color="#10B981"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#hBg_${safeInitial})"/>
    <rect x="1" y="1" width="398" height="238" fill="none" stroke="#334155" stroke-width="1.5"/>
    <circle cx="200" cy="86" r="44" fill="#1E293B" stroke="url(#hAcc_${safeInitial})" stroke-width="2.5"/>
    <text x="200" y="100" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="800" fill="#F8FAFC">${safeInitial}</text>
    <text x="200" y="156" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#F8FAFC" letter-spacing="0.5">${cleanName}</text>
    <text x="200" y="178" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94A3B8" letter-spacing="0.8">WORQDEN VERIFIED HOTEL</text>
    <rect x="160" y="196" width="80" height="3" rx="1.5" fill="url(#hAcc_${safeInitial})"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function getCandidateFallbackImage(name) {
  const initial = ((name || "C").trim().charAt(0) || "C").toUpperCase();
  const safeInitial = initial.replace(/[<>&"]/g, "");
  const cleanName = (name || "Candidate").replace(/[<>&"]/g, "").trim().substring(0, 26);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
    <defs>
      <linearGradient id="cBg_${safeInitial}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="cAcc_${safeInitial}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6"/>
        <stop offset="100%" stop-color="#10B981"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#cBg_${safeInitial})"/>
    <rect x="1" y="1" width="398" height="238" fill="none" stroke="#334155" stroke-width="1.5"/>
    <circle cx="200" cy="86" r="44" fill="#1E293B" stroke="url(#cAcc_${safeInitial})" stroke-width="2.5"/>
    <text x="200" y="100" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="800" fill="#F8FAFC">${safeInitial}</text>
    <text x="200" y="156" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#F8FAFC" letter-spacing="0.5">${cleanName}</text>
    <text x="200" y="178" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94A3B8" letter-spacing="0.8">WORQDEN CANDIDATE</text>
    <rect x="160" y="196" width="80" height="3" rx="1.5" fill="url(#cAcc_${safeInitial})"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function resolveHotelImage(imageUrl, name) {
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("data:image/svg+xml;utf8") && trimmed.includes("<svg")) {
      return getHotelFallbackImage(name);
    }
    return trimmed;
  }
  return getHotelFallbackImage(name);
}

function resolveCandidateImage(imageUrl, name) {
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("data:image/svg+xml;utf8") && trimmed.includes("<svg")) {
      return getCandidateFallbackImage(name);
    }
    return trimmed;
  }
  return getCandidateFallbackImage(name);
}

if (typeof window !== "undefined") {
  window.escapeHtml = escapeHtml;
  window.escapeJs = escapeJs;
  window.getHotelFallbackImage = getHotelFallbackImage;
  window.getCandidateFallbackImage = getCandidateFallbackImage;
  window.resolveHotelImage = resolveHotelImage;
  window.resolveCandidateImage = resolveCandidateImage;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { statesDistricts, categories, organizationTypes, WORQDEN_DATA, escapeHtml, escapeJs, getHotelFallbackImage, getCandidateFallbackImage, resolveHotelImage, resolveCandidateImage };
}


